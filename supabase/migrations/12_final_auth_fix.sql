-- 1. FIX RLS RECURSION
-- We need to ensure that checking if a user is an admin doesn't trigger an infinite loop.

-- a. Drop existing recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins/Bakers can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins/Bakers can update orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- b. Create the safest possible role check functions
-- SECURITY DEFINER and specifically targeting the auth.uid() row
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'baker')
  );
$$;

-- c. Re-enable clean policies
-- For profiles: Allow users to see their own row, and admins to see all.
-- Note: the "view own row" policy is CRITICAL to avoid recursion in is_admin()
CREATE POLICY "Profiles: Users can view own" ON profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles: Admins can view all" ON profiles 
FOR SELECT USING (is_admin());

-- For products
CREATE POLICY "Products: Admins can manage all" ON products 
FOR ALL USING (is_admin());

-- For orders
CREATE POLICY "Orders: Admins/Bakers can view all" ON orders 
FOR SELECT USING (is_staff());

CREATE POLICY "Orders: Admins/Bakers can update all" ON orders 
FOR UPDATE USING (is_staff());

-- 2. Ensure categories also have proper management policies
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

CREATE POLICY "Categories: Admins can manage all" ON categories 
FOR ALL USING (is_admin());
