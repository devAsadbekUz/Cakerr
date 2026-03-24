-- Multi-Photo Support Migration
-- 1. Add 'images' column as a text array
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. Migrate existing 'image_url' data into the new 'images' array
-- We create an array containing the single image_url if it's not null
UPDATE products 
SET images = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL);

-- 3. (Optional but recommended) Add a comment for documentation
COMMENT ON COLUMN products.images IS 'Array of image URLs for the product gallery. The first image is the primary thumbnail.';
