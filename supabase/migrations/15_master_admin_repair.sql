-- ==========================================
-- NUCLEAR ADMIN REPAIR & MASTER CONFIGURATION
-- ==========================================

-- 1. FORCE ROLE UPGRADE
-- This ensures the person running the script becomes a super-admin instantly.
UPDATE profiles 
SET role = 'admin' 
WHERE id = auth.uid();

-- 2. FIX DATABASE CONSTRAINTS (FOR HARD DELETE)
-- Allow deleting categories (will delete products inside)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE products 
  ADD CONSTRAINT products_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) 
  ON DELETE CASCADE;

-- Allow deleting products (will NOT delete orders, just sets product_id to NULL)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items 
  ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) 
  ON DELETE SET NULL;

-- 3. RESET & SIMPLIFY RLS (REMOVE ALL RECURSION)
-- We will stop using the is_admin() function for a moment to prevent loops.

-- Disable RLS temporarily to clean up
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Drop all problematic policies
DROP POLICY IF EXISTS "Categories: Admins can manage all" ON categories;
DROP POLICY IF EXISTS "Categories: Anyone can view" ON categories;
DROP POLICY IF EXISTS "Products: Admins can manage all" ON products;
DROP POLICY IF EXISTS "Anyone can view available products" ON products;

-- Re-enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Simple, Robust Policies
-- Categories
CREATE POLICY "Categories: View" ON categories FOR SELECT USING (true);
CREATE POLICY "Categories: Manage" ON categories FOR ALL 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Products
CREATE POLICY "Products: View" ON products FOR SELECT USING (is_available = true);
CREATE POLICY "Products: Manage" ON products FOR ALL 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. CLEANUP LEGACY DATA
-- If you have a specific product that won't delete, this ensures it has no blockers.
-- (Any constraints are now CASCADE or SET NULL, so DELETE will work).
