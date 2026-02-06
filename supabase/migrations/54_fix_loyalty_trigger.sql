-- Migration: Fix Loyalty System
-- Fixes issues with loyalty rate parsing and ensures trigger works correctly

BEGIN;

-- 1. Ensure app_settings has the loyalty_rate with correct format
-- The value should be stored as a plain number string, not JSONB
INSERT INTO public.app_settings (key, value)
VALUES ('loyalty_rate', '0.05')
ON CONFLICT (key) DO UPDATE SET value = '0.05';

-- 2. Fix the trigger function to properly parse the value
-- The value column is JSONB but we're storing string values
CREATE OR REPLACE FUNCTION public.handle_order_completion_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    v_loyalty_rate NUMERIC;
    v_coins_to_award INTEGER;
    v_rate_text TEXT;
BEGIN
    -- Only trigger when status moves to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        
        -- Get the current loyalty rate from settings
        -- Handle both JSONB string and raw text formats
        SELECT value::text INTO v_rate_text 
        FROM public.app_settings 
        WHERE key = 'loyalty_rate';
        
        -- Remove quotes if present (JSONB stores strings with quotes)
        v_rate_text := TRIM(BOTH '"' FROM v_rate_text);
        v_loyalty_rate := v_rate_text::NUMERIC;
        
        IF v_loyalty_rate IS NULL OR v_loyalty_rate <= 0 THEN 
            v_loyalty_rate := 0.05; 
        END IF;

        -- Calculate coins (rounding down)
        v_coins_to_award := FLOOR(NEW.total_price * v_loyalty_rate);

        RAISE NOTICE 'Loyalty trigger: order %, rate %, price %, coins %', 
            NEW.id, v_loyalty_rate, NEW.total_price, v_coins_to_award;

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

-- 3. Ensure trigger exists
DROP TRIGGER IF EXISTS tr_order_completion_loyalty ON public.orders;
CREATE TRIGGER tr_order_completion_loyalty
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_completion_loyalty();

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_order_completion_loyalty() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_order_completion_loyalty() TO service_role;

COMMIT;
