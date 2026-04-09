-- Description: Ensures the custom cake placeholder product exists.
-- The cart_items table has: product_id UUID REFERENCES products(id) NOT NULL
-- This migration ensures the reserved Nil UUID product is present and active.

INSERT INTO public.products (
    id,
    title,
    description,
    base_price,
    image_url,
    category,
    is_available,
    deleted_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Maxsus tort / Особый торт',
    'Mijoz tomonidan sozlanadigan maxsus tort / Особый торт по индивидуальному заказу',
    0,
    NULL,
    'Maxsus',
    true,
    NULL
)
ON CONFLICT (id) DO UPDATE
    SET title        = EXCLUDED.title,
        is_available = true,
        description  = EXCLUDED.description,
        deleted_at   = NULL;

-- Ensure it's not soft-deleted if it was previously hidden
UPDATE public.products 
SET deleted_at = NULL, is_available = true 
WHERE id = '00000000-0000-0000-0000-000000000000';
