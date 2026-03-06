-- Add sort_order column to categories for admin-controlled ordering
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Backfill existing categories with sequential sort_order based on creation date
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM categories
)
UPDATE categories SET sort_order = numbered.rn
FROM numbered WHERE categories.id = numbered.id;
