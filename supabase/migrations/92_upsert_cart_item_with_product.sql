-- Rewrite upsert_cart_item to return product fields in the same query.
-- Uses a CTE so the INSERT and the products JOIN resolve in one round-trip,
-- eliminating the extra SELECT the API route was doing after every add-to-cart.
-- Must drop first because the RETURNS TABLE signature changed.
DROP FUNCTION IF EXISTS public.upsert_cart_item(uuid, uuid, int, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.upsert_cart_item(
    p_user_id       uuid,
    p_product_id    uuid,
    p_quantity      int,
    p_portion       text,
    p_flavor        text,
    p_custom_note   text,
    p_configuration jsonb
)
RETURNS TABLE (
    id                 uuid,
    user_id            uuid,
    product_id         uuid,
    quantity           int,
    portion            text,
    flavor             text,
    custom_note        text,
    configuration      jsonb,
    created_at         timestamptz,
    product_title      text,
    product_base_price numeric,
    product_image_url  text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH upserted AS (
        INSERT INTO public.cart_items
            (user_id, product_id, quantity, portion, flavor, custom_note, configuration)
        VALUES
            (p_user_id, p_product_id, p_quantity, p_portion, p_flavor, p_custom_note, p_configuration)
        ON CONFLICT (user_id, product_id, portion, flavor)
        DO UPDATE SET
            quantity      = public.cart_items.quantity + EXCLUDED.quantity,
            custom_note   = EXCLUDED.custom_note,
            configuration = EXCLUDED.configuration,
            created_at    = public.cart_items.created_at
        RETURNING *
    )
    SELECT
        u.id,
        u.user_id,
        u.product_id,
        u.quantity,
        u.portion,
        u.flavor,
        u.custom_note,
        u.configuration,
        u.created_at,
        p.title      AS product_title,
        p.base_price AS product_base_price,
        p.image_url  AS product_image_url
    FROM upserted u
    JOIN public.products p ON p.id = u.product_id;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_cart_item TO authenticated, service_role;
