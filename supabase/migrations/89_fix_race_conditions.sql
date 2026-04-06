-- Migration 89: Fix race conditions in create_order_v2
--
-- Problem 1 (Coins): The coin balance check was a plain SELECT. Two concurrent
-- checkouts by the same user could both read the same balance, both pass the
-- check, and both subtract — resulting in a negative coin balance.
-- Fix: SELECT ... FOR UPDATE locks the profile row for the transaction duration.
--
-- Problem 2 (Promo global limit): The max_global_uses check existed only in the
-- /api/promo/validate route (application layer). The RPC itself never checked it,
-- and it was a plain read anyway. Two concurrent checkouts could both pass the
-- API-layer check and both increment total_uses beyond the limit.
-- Fix: Lock the promo_codes row with FOR UPDATE inside the RPC and check the
-- global limit there, where it is enforced atomically.

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
    -- FOR UPDATE locks the profile row for this transaction so a concurrent
    -- checkout cannot read the same balance before this one commits.
    SELECT coins INTO v_user_coins
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_user_coins < p_coins_spent THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- 2. Validate Promo Code
    IF p_promo_code_id IS NOT NULL THEN
        -- FOR UPDATE locks the promo_codes row so concurrent transactions cannot
        -- both pass the global limit check before either increments total_uses.
        SELECT * INTO v_promo_code_record
        FROM public.promo_codes
        WHERE id = p_promo_code_id
        FOR UPDATE;

        IF v_promo_code_record.id IS NULL THEN
            RAISE EXCEPTION 'Invalid promo code';
        END IF;

        IF NOT v_promo_code_record.is_active THEN
            RAISE EXCEPTION 'Promo code is inactive';
        END IF;

        IF v_promo_code_record.expires_at IS NOT NULL AND v_promo_code_record.expires_at < NOW() THEN
            RAISE EXCEPTION 'Promo code has expired';
        END IF;

        -- Global usage limit check — now atomic thanks to FOR UPDATE above
        IF v_promo_code_record.max_global_uses IS NOT NULL AND
           v_promo_code_record.total_uses >= v_promo_code_record.max_global_uses THEN
            RAISE EXCEPTION 'Promo code global limit reached';
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
