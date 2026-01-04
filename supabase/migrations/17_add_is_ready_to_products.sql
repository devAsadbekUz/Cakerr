-- Add is_ready status to products
-- Marking a product as 'Tayyor' means it's available for immediate delivery

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT FALSE;
