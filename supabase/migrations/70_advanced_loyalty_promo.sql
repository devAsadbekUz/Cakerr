-- Migration 70: Advanced Loyalty & Promo Controls
-- 1. Add expiry to promo codes
-- 2. Add admin coin adjustment RPC
-- 3. Add coin expiry logic (Function)

BEGIN;

-- ==========================================
-- 1. PROMO CODE EXPIRY
-- ==========================================
ALTER TABLE public.promo_codes 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- Update create_order_v2 to check for expiration
CREATE OR REPLACE FUNCTION public.create_order_v2(
    p_user_id UUID,
    p_items JSONB,
    p_delivery_address JSONB,
    p_delivery_time TIMESTAMPTZ,
    p_delivery_slot TEXT,
    p_payment_method TEXT,
    p_comment TEXT DEFAULT NULL,
    p_coins_spent INTEGER DEFAULT 0,
    p_promo_code_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_total_price INTEGER := 0;
    v_subtotal INTEGER := 0;
    v_delivery_fee INTEGER := 25000;
    v_item JSONB;
    v_promo_discount INTEGER := 0;
    v_promo_code_record RECORD;
    v_user_coins INTEGER;
    v_usage_count INTEGER;
    v_user_order_count INTEGER;
BEGIN
    -- 1. Validate User Coins
    SELECT coins INTO v_user_coins FROM public.profiles WHERE id = p_user_id;
    IF v_user_coins < p_coins_spent THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- 2. Validate Promo Code (if provided)
    IF p_promo_code_id IS NOT NULL THEN
        SELECT * INTO v_promo_code_record FROM public.promo_codes WHERE id = p_promo_code_id;
        
        IF v_promo_code_record.id IS NULL THEN
            RAISE EXCEPTION 'Invalid promo code';
        END IF;

        IF NOT v_promo_code_record.is_active THEN
            RAISE EXCEPTION 'Promo code is inactive';
        END IF;

        -- CHECK EXPIRATION
        IF v_promo_code_record.expires_at IS NOT NULL AND v_promo_code_record.expires_at < NOW() THEN
            RAISE EXCEPTION 'Promo code has expired';
        END IF;

        -- Check global limit
        IF v_promo_code_record.max_global_uses IS NOT NULL AND v_promo_code_record.total_uses >= v_promo_code_record.max_global_uses THEN
            RAISE EXCEPTION 'Promo code global limit reached';
        END IF;

        -- Check user limit
        SELECT usage_count INTO v_usage_count FROM public.user_promo_usages 
        WHERE user_id = p_user_id AND promo_code_id = p_promo_code_id;
        
        IF v_usage_count IS NOT NULL AND v_usage_count >= v_promo_code_record.uses_per_user THEN
            RAISE EXCEPTION 'You have already used this promo code';
        END IF;

        -- Check first order only
        IF v_promo_code_record.is_first_order_only THEN
            SELECT count(*) INTO v_user_order_count FROM public.orders WHERE user_id = p_user_id AND status = 'completed' AND id != '00000000-0000-0000-0000-000000000000';
            IF v_user_order_count > 0 THEN
                RAISE EXCEPTION 'Promo code only valid for first order';
            END IF;
        END IF;
        
        v_promo_discount := v_promo_code_record.discount_amount;
    END IF;

    -- 3. Calculate Subtotal
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_subtotal := v_subtotal + ((v_item->>'price')::INTEGER * (v_item->>'quantity')::INTEGER);
    END LOOP;

    -- Check min order amount for promo
    IF p_promo_code_id IS NOT NULL AND v_subtotal < v_promo_code_record.min_order_amount THEN
        RAISE EXCEPTION 'Subtotal below minimum order amount for this promo';
    END IF;

    -- 4. Final Price Calculation
    v_total_price := (v_subtotal - v_promo_discount - p_coins_spent) + v_delivery_fee;
    
    IF v_total_price < v_delivery_fee THEN
        v_total_price := v_delivery_fee; 
    END IF;

    -- 5. Create Order
    INSERT INTO public.orders (
        user_id, total_price, status, delivery_address, delivery_time, 
        delivery_slot, payment_method, comment, coins_spent, promo_code_id
    ) VALUES (
        p_user_id, v_total_price, 'new', p_delivery_address, p_delivery_time, 
        p_delivery_slot, p_payment_method, p_comment, p_coins_spent, p_promo_code_id
    ) RETURNING id INTO v_order_id;

    -- 6. Insert Order Items
    INSERT INTO public.order_items (order_id, product_id, quantity, price, options)
    SELECT v_order_id, (item->>'product_id')::UUID, (item->>'quantity')::INTEGER, (item->>'price')::INTEGER, (item->'options')
    FROM jsonb_array_elements(p_items) AS item;

    -- 7. Update User Coins
    IF p_coins_spent > 0 THEN
        UPDATE public.profiles SET coins = coins - p_coins_spent WHERE id = p_user_id;
        INSERT INTO public.coin_transactions (user_id, amount, type, description, order_id)
        VALUES (p_user_id, -p_coins_spent, 'spend', 'Used during checkout', v_order_id);
    END IF;

    -- 8. Update Promo Usage
    IF p_promo_code_id IS NOT NULL THEN
        INSERT INTO public.user_promo_usages (user_id, promo_code_id, usage_count)
        VALUES (p_user_id, p_promo_code_id, 1)
        ON CONFLICT (user_id, promo_code_id) 
        DO UPDATE SET usage_count = public.user_promo_usages.usage_count + 1;

        UPDATE public.promo_codes SET total_uses = total_uses + 1 WHERE id = p_promo_code_id;
    END IF;

    RETURN jsonb_build_object('order_id', v_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. ADMIN COIN ADJUSTMENT RPC
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_adjust_coins(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Update the user's profile balance
    UPDATE public.profiles 
    SET coins = GREATEST(0, coins + p_amount) 
    WHERE id = p_user_id;

    -- Record the transaction
    INSERT INTO public.coin_transactions (user_id, amount, type, description)
    VALUES (p_user_id, p_amount, 'admin_adjustment', p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. COIN EXPIRY LOGIC (FIFO Approximation)
-- ==========================================
CREATE OR REPLACE FUNCTION public.process_expired_coins()
RETURNS VOID AS $$
DECLARE
    v_record RECORD;
    v_user_balance INTEGER;
    v_to_expire INTEGER;
BEGIN
    -- Find earnings that are exactly 6 months old today (or older)
    -- We'll process any 'earn' or positive 'admin_adjustment' that hasn't been expired yet.
    -- To keep it simple, we use a window of 6 months.
    
    FOR v_record IN 
        SELECT user_id, SUM(amount) as old_earnings
        FROM public.coin_transactions
        WHERE (type = 'earn' OR (type = 'admin_adjustment' AND amount > 0))
          AND created_at < (NOW() - INTERVAL '6 months')
          -- Ensure we don't double-expire by checking for previous expiry logs
          AND NOT EXISTS (
              SELECT 1 FROM public.coin_transactions ct2 
              WHERE ct2.user_id = public.coin_transactions.user_id 
              AND ct2.type = 'admin_adjustment' 
              AND ct2.description LIKE 'Muddati o''tgan tangalar%'
              AND ct2.created_at::DATE = NOW()::DATE
          )
        GROUP BY user_id
    LOOP
        SELECT coins INTO v_user_balance FROM public.profiles WHERE id = v_record.user_id;
        
        -- Approximate FIFO: Expiry only applies if the balance hasn't already been spent.
        -- This is a conservative approach.
        v_to_expire := LEAST(v_user_balance, v_record.old_earnings);
        
        IF v_to_expire > 0 THEN
            UPDATE public.profiles SET coins = coins - v_to_expire WHERE id = v_record.user_id;
            
            INSERT INTO public.coin_transactions (user_id, amount, type, description)
            VALUES (v_record.user_id, -v_to_expire, 'admin_adjustment', 'Muddati o''tgan tangalar (6 oydan oshgan)');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
