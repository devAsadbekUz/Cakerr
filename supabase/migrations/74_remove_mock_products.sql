-- Migration: 74_remove_mock_products.sql
-- Description: Removes initial seed mock products from the catalog.

UPDATE public.products 
SET 
    is_available = false,
    deleted_at = NOW()
WHERE title IN (
    'Rainbow Splash',
    'Classic Chocolate Birthday',
    'Classic Chocolate',
    'Elegant White Tier',
    'Floral Cascading',
    'Golden Jubilee',
    'Heart Red Velvet',
    'Dino Adventure',
    'Unicorn Dream',
    'Berry Blast',
    'Citrus Zest',
    'Chocolate Strawberry Kiss',
    'Valentine''s Rose'
);
