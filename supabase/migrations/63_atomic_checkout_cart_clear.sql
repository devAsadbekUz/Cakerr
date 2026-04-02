-- Migration: Atomic checkout cart clearing and payment method persistence

BEGIN;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

CREATE OR REPLACE FUNCTION public.create_order_v2(
    p_user_id UUID,
    p_order_data JSONB,
    p_items JSONB,
    p_coins_spent INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_coin_transaction_id UUID;
    v_profile_coins INTEGER;
    v_payment_method TEXT;
    v_result_order JSONB;
BEGIN
    v_payment_method := COALESCE(NULLIF(p_order_data->>'payment_method', ''), 'cash');

    IF v_payment_method NOT IN ('cash', 'card') THEN
        RAISE EXCEPTION 'Invalid payment method';
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
        payment_method
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
        v_payment_method
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

GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER) TO service_role;

COMMIT;
