-- Allow deleting categories by adding ON DELETE CASCADE to products relationship
-- This will automatically delete products associated with the deleted category

DO $$ 
BEGIN 
  -- Find and drop the existing constraint if it exists
  -- Default name for 'add column references' is usually 'table_column_fkey'
  ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
  
  -- Add the constraint back with CASCADE
  ALTER TABLE products 
  ADD CONSTRAINT products_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES categories(id) 
  ON DELETE CASCADE;
END $$;
