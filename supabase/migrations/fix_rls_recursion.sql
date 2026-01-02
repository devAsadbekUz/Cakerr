-- 1. Create security definer functions to check roles
-- These avoid infinite recursion in RLS policies by bypassing RLS within the function itself
-- SET search_path = public is a security best practice for SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'baker')
  );
END;
$$;

-- 2. Drop the old recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins/Bakers can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins/Bakers can update orders" ON orders;

-- 3. Create new policies using the safe functions
CREATE POLICY "Admins can view all profiles" ON profiles 
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage products" ON products 
FOR ALL USING (is_admin());

CREATE POLICY "Admins/Bakers can view all orders" ON orders 
FOR SELECT USING (is_staff());

CREATE POLICY "Admins/Bakers can update orders" ON orders 
FOR UPDATE USING (is_staff());
