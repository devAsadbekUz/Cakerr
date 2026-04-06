-- Unique constraint so ON CONFLICT works correctly (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cart_items_user_product_unique'
          AND conrelid = 'public.cart_items'::regclass
    ) THEN
        ALTER TABLE public.cart_items
            ADD CONSTRAINT cart_items_user_product_unique
            UNIQUE (user_id, product_id, portion, flavor);
    END IF;
END;
$$;

-- Atomic upsert: increments quantity if the row already exists, inserts otherwise.
-- Replaces the SELECT + conditional INSERT/UPDATE pattern in the API route,
-- cutting the add-to-cart path from 3 DB round-trips to 1.
CREATE OR REPLACE FUNCTION public.upsert_cart_item(
    p_user_id      uuid,
    p_product_id   uuid,
    p_quantity     int,
    p_portion      text,
    p_flavor       text,
    p_custom_note  text,
    p_configuration jsonb
)
RETURNS TABLE (
    id             uuid,
    user_id        uuid,
    product_id     uuid,
    quantity       int,
    portion        text,
    flavor         text,
    custom_note    text,
    configuration  jsonb,
    created_at     timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.cart_items
        (user_id, product_id, quantity, portion, flavor, custom_note, configuration)
    VALUES
        (p_user_id, p_product_id, p_quantity, p_portion, p_flavor, p_custom_note, p_configuration)
    ON CONFLICT (user_id, product_id, portion, flavor)
    DO UPDATE SET
        quantity      = public.cart_items.quantity + EXCLUDED.quantity,
        custom_note   = EXCLUDED.custom_note,
        configuration = EXCLUDED.configuration,
        created_at    = public.cart_items.created_at  -- keep original timestamp
    RETURNING
        id, user_id, product_id, quantity, portion, flavor, custom_note, configuration, created_at;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_cart_item TO authenticated, service_role;
