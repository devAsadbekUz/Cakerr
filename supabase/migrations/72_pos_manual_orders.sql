-- Migration: Admin POS Manual Orders support
-- Adds guest metadata and staff tracking to the orders table

BEGIN;

-- 1. Add columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- 2. Create POS-specific order creation RPC
-- This function handles guest orders (user_id is NULL) and logs the staff creator.
CREATE OR REPLACE FUNCTION public.create_pos_order(
    p_staff_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_order_data JSONB,
    p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_result_order JSONB;
BEGIN
    -- 1. Insert Order
    -- user_id is NULL for POS guest orders
    INSERT INTO public.orders (
        user_id,
        customer_name,
        customer_phone,
        created_by,
        status,
        total_price,
        delivery_address,
        delivery_time,
        delivery_slot,
        comment
    )
    VALUES (
        NULL,
        p_customer_name,
        p_customer_phone,
        p_staff_id,
        'new',
        (p_order_data->>'total_price')::NUMERIC,
        p_order_data->'delivery_address',
        (p_order_data->>'delivery_time')::TIMESTAMPTZ,
        p_order_data->>'delivery_slot',
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_pos_order(UUID, TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pos_order(UUID, TEXT, TEXT, JSONB, JSONB) TO service_role;

COMMIT;
