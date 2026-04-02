-- Migration: 67_ensure_custom_cake_product.sql
-- Description: Ensures the custom cake placeholder product exists.
--
-- The cart_items table has: product_id UUID REFERENCES products(id) NOT NULL
-- So inserting a "Maxsus tort" (custom cake) with the reserved UUID
-- '00000000-0000-0000-0000-000000000000' fails if this row is missing.
--
-- Root cause: migration 62_custom_cakes_storage.sql may have failed silently,
-- or the category TEXT column was used incorrectly. This migration fixes it
-- using the correct schema (category_id TEXT, deleted_at TIMESTAMPTZ).

INSERT INTO public.products (
    id,
    title,
    description,
    base_price,
    image_url,
    category,
    is_available
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Maxsus tort',
    'Mijoz tomonidan sozlanadigan maxsus tort',
    0,
    NULL,
    'Maxsus',
    true
)
ON CONFLICT (id) DO UPDATE
    SET title        = EXCLUDED.title,
        is_available = true,
        deleted_at   = NULL;
