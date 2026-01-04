-- 1. PROMOTE YOURSELF TO ADMIN
-- Run this to make your currently logged-in user an Admin
UPDATE profiles 
SET role = 'admin' 
WHERE id = auth.uid();

-- 2. ENSURE PUBLIC CAN VIEW CATEGORIES
-- Without this, the website home page might not show categories
DROP POLICY IF EXISTS "Categories: Anyone can view" ON categories;
CREATE POLICY "Categories: Anyone can view" ON categories 
FOR SELECT USING (true);

-- 3. FINAL VERIFICATION OF ADMIN POLICY
-- Make sure the management policy is clean
DROP POLICY IF EXISTS "Categories: Admins can manage all" ON categories;
CREATE POLICY "Categories: Admins can manage all" 
ON categories 
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
