-- Safely update category relationship to allow deletion without cascading product deletion
-- This avoids issues when products are referenced by orders

DO $$ 
BEGIN 
  -- Find and drop the existing constraint
  ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
  
  -- Add the constraint back with SET NULL
  -- When a category is deleted, the products simply lose their category link instead of being deleted
  ALTER TABLE products 
  ADD CONSTRAINT products_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES categories(id) 
  ON DELETE SET NULL;
END $$;
