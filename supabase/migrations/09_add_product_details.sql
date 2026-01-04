-- Add details JSONB column to products table to store attributes like shapes, flavors, etc.
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
