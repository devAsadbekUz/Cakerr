-- Migration 86: Restore atomic cart clearing in create_order_v2
-- Migration 84 rewrote the RPC for pickup support but accidentally dropped the
-- DELETE FROM cart_items step that was present since migration 63.
-- This restores it so cart is cleared within the same transaction as order creation.

BEGIN;

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
    v_total_price INTEGER := 0;
    v_subtotal INTEGER := 0;
    v_item JSONB;
    v_promo_discount INTEGER := 0;
    v_promo_code_record RECORD;
    v_user_coins INTEGER;
    v_usage_count INTEGER;
    v_user_order_count INTEGER;
    v_delivery_type TEXT;
    v_branch_id UUID;
BEGIN
    -- 1. Validate User Coins
    SELECT coins INTO v_user_coins FROM public.profiles WHERE id = p_user_id;
    IF v_user_coins < p_coins_spent THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- 2. Validate Promo Code
    IF p_promo_code_id IS NOT NULL THEN
        SELECT * INTO v_promo_code_record FROM public.promo_codes WHERE id = p_promo_code_id;
        IF v_promo_code_record.id IS NULL THEN
            RAISE EXCEPTION 'Invalid promo code';
        END IF;

        IF NOT v_promo_code_record.is_active THEN
            RAISE EXCEPTION 'Promo code is inactive';
        END IF;

        IF v_promo_code_record.expires_at IS NOT NULL AND v_promo_code_record.expires_at < NOW() THEN
            RAISE EXCEPTION 'Promo code has expired';
        END IF;

        SELECT usage_count INTO v_usage_count FROM public.user_promo_usages
        WHERE user_id = p_user_id AND promo_code_id = p_promo_code_id;

        IF v_usage_count IS NOT NULL AND v_usage_count >= v_promo_code_record.uses_per_user THEN
            RAISE EXCEPTION 'You have already used this promo code';
        END IF;

        v_promo_discount := v_promo_code_record.discount_amount;
    END IF;

    -- 3. Extract Fulfillment Info
    v_delivery_type := COALESCE(p_order_data->>'delivery_type', 'delivery');
    v_branch_id := NULLIF(p_order_data->>'branch_id', '')::UUID;

    -- 4. Create Order
    INSERT INTO public.orders (
        user_id,
        total_price,
        status,
        delivery_address,
        delivery_time,
        delivery_slot,
        payment_method,
        comment,
        coins_spent,
        promo_code_id,
        delivery_type,
        branch_id
    ) VALUES (
        p_user_id,
        (p_order_data->>'total_price')::INTEGER,
        'new',
        p_order_data->'delivery_address',
        (p_order_data->>'delivery_time')::TIMESTAMPTZ,
        p_order_data->>'delivery_slot',
        p_order_data->>'payment_method',
        p_order_data->>'comment',
        p_coins_spent,
        p_promo_code_id,
        v_delivery_type::delivery_type,
        v_branch_id
    ) RETURNING id INTO v_order_id;

    -- 5. Insert Items
    INSERT INTO public.order_items (
        order_id, product_id, name, quantity, unit_price, configuration
    )
    SELECT
        v_order_id,
        CASE WHEN (item->>'product_id') = '' OR (item->>'product_id') IS NULL THEN NULL
             ELSE (item->>'product_id')::UUID END,
        (item->>'name'),
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::NUMERIC,
        (item->'configuration')
    FROM jsonb_array_elements(p_items) AS item;

    -- 6. Update User Coins
    IF p_coins_spent > 0 THEN
        UPDATE public.profiles SET coins = coins - p_coins_spent WHERE id = p_user_id;
        INSERT INTO public.coin_transactions (user_id, amount, type, description, order_id)
        VALUES (p_user_id, -p_coins_spent, 'spend', 'Used during checkout', v_order_id);
    END IF;

    -- 7. Update Promo Usage
    IF p_promo_code_id IS NOT NULL THEN
        INSERT INTO public.user_promo_usages (user_id, promo_code_id, usage_count)
        VALUES (p_user_id, p_promo_code_id, 1)
        ON CONFLICT (user_id, promo_code_id) DO UPDATE
            SET usage_count = public.user_promo_usages.usage_count + 1;
        UPDATE public.promo_codes SET total_uses = total_uses + 1 WHERE id = p_promo_code_id;
    END IF;

    -- 8. Atomically clear the user's cart now that the order is committed
    DELETE FROM public.cart_items WHERE user_id = p_user_id;

    RETURN jsonb_build_object('order_id', v_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_v2(UUID, JSONB, JSONB, INTEGER, UUID) TO service_role;

COMMIT;
