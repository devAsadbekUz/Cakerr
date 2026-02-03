-- Migration: RLS Subquery Optimization
-- Wraps auth.uid() and other functions in subqueries to improve query planner efficiency.
-- This prevents the database from re-evaluating the current user's ID for every single row.

BEGIN;

-- 1. Optimize profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING ((SELECT auth.uid()) = id);


-- 2. Optimize favorites policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can add their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can remove their own favorites" ON favorites;

CREATE POLICY "Users can view their own favorites" ON favorites
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can add their own favorites" ON favorites
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can remove their own favorites" ON favorites
    FOR DELETE USING ((SELECT auth.uid()) = user_id);


-- 3. Optimize addresses policies
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;

CREATE POLICY "Users can manage their own addresses" ON public.addresses
    FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);


-- 4. Optimize orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;

CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));


-- 5. Optimize helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
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
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'baker')
  );
END;
$$;

COMMIT;
