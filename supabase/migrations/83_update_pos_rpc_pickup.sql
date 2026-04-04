-- Migration 83: Update POS RPC for Pickup System
-- Updates the create_pos_order function to handle delivery_type and branch_id.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_pos_order(
    p_staff_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_order_data JSONB,
    p_items JSONB,
    p_created_by_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_result_order JSONB;
BEGIN
    -- 1. Insert Order
    INSERT INTO public.orders (
        user_id,
        customer_name,
        customer_phone,
        created_by,
        created_by_name,
        status,
        total_price,
        delivery_address,
        delivery_time,
        delivery_slot,
        delivery_type,
        branch_id,
        comment
    )
    VALUES (
        NULL,
        p_customer_name,
        p_customer_phone,
        p_staff_id,
        p_created_by_name,
        'new',
        (p_order_data->>'total_price')::NUMERIC,
        p_order_data->'delivery_address',
        (p_order_data->>'delivery_time')::TIMESTAMPTZ,
        p_order_data->>'delivery_slot',
        COALESCE(p_order_data->>'delivery_type', 'delivery'),
        (p_order_data->>'branch_id')::UUID,
        p_order_data->>'comment'
    )
    RETURNING id INTO v_order_id;

    -- 2. Insert Items
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
        (item->'configuration')
    FROM jsonb_array_elements(p_items) AS item;

    -- 3. Return the created order
    SELECT row_to_json(o)::jsonb INTO v_result_order 
    FROM public.orders o 
    WHERE o.id = v_order_id;

    RETURN v_result_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
