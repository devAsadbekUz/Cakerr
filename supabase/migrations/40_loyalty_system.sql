-- Migration: Shirin Tangalar Loyalty System
-- This script sets up the infrastructure for earning and spending "Shirin Tangalar" (Sweet Coins).

BEGIN;

-- 1. ADD COINS TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0 CHECK (coins >= 0);

-- 2. CREATE APP SETTINGS TABLE
-- This allows the business to change the cashback rate without code changes.
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- Seed initial loyalty rate (5%)
INSERT INTO public.app_settings (key, value)
VALUES ('loyalty_rate', '0.05')
ON CONFLICT (key) DO NOTHING;

-- 3. CREATE COIN TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount INTEGER NOT NULL, -- Positive for earning, negative for spending
    type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'refund', 'admin_adjustment')),
    description TEXT,
    order_id UUID REFERENCES public.orders(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. UPDATE ORDERS TABLE
-- Track how many coins were spent/earned per order
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS coins_spent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS coins_earned INTEGER DEFAULT 0;

-- 5. FUNCTION TO AWARD COINS ON COMPLETION
-- This runs whenever an order status changes to 'completed'
CREATE OR REPLACE FUNCTION public.handle_order_completion_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    v_loyalty_rate NUMERIC;
    v_coins_to_award INTEGER;
BEGIN
    -- Only trigger when status moves to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        
        -- Get the current loyalty rate from settings (default to 0.05 if missing)
        SELECT (value->>0)::NUMERIC INTO v_loyalty_rate 
        FROM public.app_settings 
        WHERE key = 'loyalty_rate';
        
        IF v_loyalty_rate IS NULL THEN v_loyalty_rate := 0.05; END IF;

        -- Calculate coins (rounding down)
        -- Note: We award coins based on the total_price (or maybe total_price - coins_spent? Let's use total paid)
        v_coins_to_award := FLOOR(NEW.total_price * v_loyalty_rate);

        IF v_coins_to_award > 0 THEN
            -- 1. Update the order record
            UPDATE public.orders SET coins_earned = v_coins_to_award WHERE id = NEW.id;

            -- 2. Record the transaction
            INSERT INTO public.coin_transactions (user_id, amount, type, description, order_id)
            VALUES (NEW.user_id, v_coins_to_award, 'earn', 'Order completion reward', NEW.id);

            -- 3. Update the user's profile balance
            UPDATE public.profiles SET coins = coins + v_coins_to_award WHERE id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. CREATE TRIGGER
DROP TRIGGER IF EXISTS tr_order_completion_loyalty ON public.orders;
CREATE TRIGGER tr_order_completion_loyalty
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_completion_loyalty();

-- 7. RPC TO DEDUCT COINS (Atomic with transaction log)
CREATE OR REPLACE FUNCTION public.deduct_coins(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
    -- 1. Deduct from profile
    UPDATE public.profiles 
    SET coins = coins - p_amount 
    WHERE id = p_user_id;

    -- 2. Record transaction
    INSERT INTO public.coin_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -p_amount, 'spend', 'Spent on order checkout');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. RLS POLICIES
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- App Settings: Everyone can view (to see rate), only admins can edit
DROP POLICY IF EXISTS "Anyone can view settings" ON public.app_settings;
CREATE POLICY "Anyone can view settings" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL USING (is_admin());

-- Coin Transactions: Users see their own, admins see all
DROP POLICY IF EXISTS "Users can view own transactions" ON public.coin_transactions;
CREATE POLICY "Users can view own transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.coin_transactions;
CREATE POLICY "Admins can view all transactions" ON public.coin_transactions FOR ALL USING (is_admin());

COMMIT;
