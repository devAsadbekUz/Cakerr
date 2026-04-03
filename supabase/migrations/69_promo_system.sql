-- Migration: Promo Code System and Admin Limits

BEGIN;

CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_amount INTEGER NOT NULL CHECK (discount_amount > 0),
    uses_per_user INTEGER DEFAULT 1,
    max_global_uses INTEGER DEFAULT NULL,
    is_first_order_only BOOLEAN DEFAULT false,
    min_order_amount INTEGER DEFAULT 0,
    total_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO service_role;

CREATE TABLE IF NOT EXISTS public.user_promo_usages (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, promo_code_id)
);

ALTER TABLE public.user_promo_usages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_promo_usages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_promo_usages TO service_role;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_discount INTEGER DEFAULT 0;

-- Function for promo refund on cancellation
CREATE OR REPLACE FUNCTION public.refund_promo_on_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if status changes from anything to 'cancelled' and order used a promo
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' AND NEW.promo_code_id IS NOT NULL THEN
        -- Safely decrement total uses globally
        UPDATE public.promo_codes
        SET total_uses = GREATEST(0, total_uses - 1)
        WHERE id = NEW.promo_code_id;
        
        -- Safely decrement user specific usages
        UPDATE public.user_promo_usages
        SET usage_count = GREATEST(0, usage_count - 1)
        WHERE user_id = NEW.user_id AND promo_code_id = NEW.promo_code_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger
DROP TRIGGER IF EXISTS trigger_refund_promo ON public.orders;
CREATE TRIGGER trigger_refund_promo
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.refund_promo_on_cancellation();

-- Update create_order_v2 to accept and handle p_promo_code_id
DROP FUNCTION IF EXISTS public.create_order_v2(UUID, JSONB, JSONB, INTEGER);
DROP FUNCTION IF EXISTS public.create_order_v2(UUID, JSONB, JSONB, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.create_order_v2(
    p_user_id UUID,
    p_order_data JSONB,
    p_items JSONB,
    p_coins_spent INTEGER DEFAULT 0,
    p_promo_code_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_coin_transaction_id UUID;
    v_profile_coins INTEGER;
    v_payment_method TEXT;
    v_result_order JSONB;
    v_promo_discount INTEGER := 0;
    v_code_record RECORD;
    v_user_usages INTEGER;
    v_completed_orders INTEGER;
BEGIN
    v_payment_method := COALESCE(NULLIF(p_order_data->>'payment_method', ''), 'cash');

    IF v_payment_method NOT IN ('cash', 'card') THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    -- 0. Validate and apply promo code
    IF p_promo_code_id IS NOT NULL THEN
        -- Lock the promo code for update to prevent concurrent race conditions
        SELECT * INTO v_code_record 
        FROM public.promo_codes 
        WHERE id = p_promo_code_id FOR UPDATE;

        IF NOT FOUND OR NOT v_code_record.is_active THEN
            RAISE EXCEPTION 'Promo code is invalid or inactive';
        END IF;

        IF v_code_record.max_global_uses IS NOT NULL AND v_code_record.total_uses >= v_code_record.max_global_uses THEN
            RAISE EXCEPTION 'Promo code has reached its global limit';
        END IF;

        v_promo_discount := COALESCE((p_order_data->>'promo_discount')::INTEGER, 0);
        IF v_promo_discount > 0 AND v_promo_discount > v_code_record.discount_amount THEN
            RAISE EXCEPTION 'Invalid promo discount amount applied';
        END IF;

        -- Check user usage
        SELECT COALESCE(usage_count, 0) INTO v_user_usages
        FROM public.user_promo_usages
        WHERE user_id = p_user_id AND promo_code_id = p_promo_code_id;

        IF v_user_usages >= v_code_record.uses_per_user THEN
            RAISE EXCEPTION 'You have reached the maximum uses for this promo code';
        END IF;

        -- Check first order constraint
        IF v_code_record.is_first_order_only THEN
            SELECT count(*) INTO v_completed_orders
            FROM public.orders
            WHERE user_id = p_user_id AND status = 'completed';

            IF v_completed_orders > 0 THEN
                RAISE EXCEPTION 'This promo code is strictly for first-time orders only';
            END IF;
        END IF;

        -- Increment Usage Log Atomically
        UPDATE public.promo_codes
        SET total_uses = total_uses + 1
        WHERE id = p_promo_code_id;

        INSERT INTO public.user_promo_usages (user_id, promo_code_id, usage_count)
        VALUES (p_user_id, p_promo_code_id, 1)
        ON CONFLICT (user_id, promo_code_id)
        DO UPDATE SET usage_count = user_promo_usages.usage_count + 1;
    END IF;

    -- 1. Validate and deduct coins if needed.
    IF p_coins_spent > 0 THEN
        SELECT coins
        INTO v_profile_coins
        FROM public.profiles
        WHERE id = p_user_id
        FOR UPDATE;

        IF v_profile_coins IS NULL OR v_profile_coins < p_coins_spent THEN
            RAISE EXCEPTION 'Insufficient coins balance';
        END IF;

        UPDATE public.profiles
        SET coins = coins - p_coins_spent
        WHERE id = p_user_id;

        INSERT INTO public.coin_transactions (user_id, amount, type, description)
        VALUES (p_user_id, -p_coins_spent, 'spend', 'Spent on order checkout')
        RETURNING id INTO v_coin_transaction_id;
    END IF;

    -- 2. Insert order.
    INSERT INTO public.orders (
        user_id,
        status,
        total_price,
        delivery_address,
        delivery_time,
        delivery_slot,
        comment,
        coins_spent,
        payment_method,
        promo_code_id,
        promo_discount
    )
    VALUES (
        p_user_id,
        'new',
        (p_order_data->>'total_price')::NUMERIC,
        p_order_data->'delivery_address',
        (p_order_data->>'delivery_time')::TIMESTAMPTZ,
        p_order_data->>'delivery_slot',
        p_order_data->>'comment',
        p_coins_spent,
        v_payment_method,
        p_promo_code_id,
        v_promo_discount
    )
    RETURNING id INTO v_order_id;

    -- 3. Attach the newly created order to the specific spend transaction.
    IF v_coin_transaction_id IS NOT NULL THEN
        UPDATE public.coin_transactions
        SET order_id = v_order_id
        WHERE id = v_coin_transaction_id;
    END IF;

    -- 4. Insert order items.
    INSERT INTO public.order_items (
        order_id,
        product_id,
        name,
        quantity,
        unit_price,
        configuration
    )
    SELECT
        v_order_id,
        CASE
            WHEN (item->>'product_id') IS NULL OR (item->>'product_id') = '' THEN NULL
            ELSE (item->>'product_id')::UUID
        END,
        item->>'name',
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::NUMERIC,
        item->'configuration'
    FROM jsonb_array_elements(p_items) AS item;

    -- 5. Clear the user's persisted cart within the same transaction.
    DELETE FROM public.cart_items
    WHERE user_id = p_user_id;

    -- 6. Return the created order.
    SELECT row_to_json(o)::jsonb
    INTO v_result_order
    FROM public.orders o
    WHERE o.id = v_order_id;

    RETURN v_result_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER, UUID) TO service_role;

-- Make sure existing callers aren't broken by offering a fallback signature wrapper
CREATE OR REPLACE FUNCTION public.create_order_v2(
    p_user_id UUID,
    p_order_data JSONB,
    p_items JSONB,
    p_coins_spent INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
    RETURN public.create_order_v2(p_user_id, p_order_data, p_items, p_coins_spent, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER) TO service_role;

COMMIT;
