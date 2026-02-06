-- Migration: Optimized Checkout RPC (STABLE FIX)
-- This version uses the EXACT column names discovered in the migrations and client code.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_v2(
    p_user_id UUID,
    p_order_data JSONB,
    p_items JSONB,
    p_coins_spent INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_profile_coins INTEGER;
    v_result_order JSONB;
BEGIN
    -- 1. Validate and Deduct Coins if needed
    IF p_coins_spent > 0 THEN
        -- Atomic check and lock
        SELECT coins INTO v_profile_coins FROM public.profiles WHERE id = p_user_id FOR UPDATE;
        
        IF v_profile_coins IS NULL OR v_profile_coins < p_coins_spent THEN
            RAISE EXCEPTION 'Insufficient coins balance';
        END IF;

        -- Deduct from profile
        UPDATE public.profiles 
        SET coins = coins - p_coins_spent 
        WHERE id = p_user_id;

        -- Record transaction
        INSERT INTO public.coin_transactions (user_id, amount, type, description)
        VALUES (p_user_id, -p_coins_spent, 'spend', 'Spent on order checkout');
    END IF;

    -- 2. Insert Order
    -- Using delivery_time, delivery_slot, and coins_spent columns discovered in schema
    INSERT INTO public.orders (
        user_id,
        status,
        total_price,
        delivery_address,
        delivery_time,
        delivery_slot,
        comment,
        coins_spent
    )
    VALUES (
        p_user_id,
        'new',
        (p_order_data->>'total_price')::NUMERIC,
        p_order_data->'delivery_address', -- JSONB
        (p_order_data->>'delivery_time')::TIMESTAMPTZ, -- Correct column name
        p_order_data->>'delivery_slot',
        p_order_data->>'comment',
        p_coins_spent
    )
    RETURNING id INTO v_order_id;

    -- 3. Update Transaction with order_id if coins spent
    IF p_coins_spent > 0 THEN
        UPDATE public.coin_transactions 
        SET order_id = v_order_id 
        WHERE user_id = p_user_id 
        AND type = 'spend' 
        AND order_id IS NULL;
    END IF;

    -- 4. Insert Items
    -- Using unit_price and configuration columns discovered in init_schema.sql
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
        (item->>'name'),
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::NUMERIC,
        (item->'configuration') -- JSONB
    FROM jsonb_array_elements(p_items) AS item;

    -- 5. Return the created order
    SELECT row_to_json(o)::jsonb INTO v_result_order 
    FROM public.orders o 
    WHERE o.id = v_order_id;

    RETURN v_result_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permissions (already granted but re-applying to be safe)
GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER) TO service_role;

COMMIT;
