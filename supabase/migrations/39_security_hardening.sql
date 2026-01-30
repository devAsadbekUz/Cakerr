-- Migration: Supabase Security Hardening
-- This migration addresses the 4 security vulnerabilities reported by Supabase Advisor.

BEGIN;

-- 1. RE-ENABLE ROW LEVEL SECURITY (Addresses 3 errors)
-- Diagnostic/Unblocker scripts previously disabled these.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 2. REMOVE OVERLY PERMISSIVE POLICIES
-- These policies were created to "unblock" development but expose data.
DROP POLICY IF EXISTS "Public Realtime Access" ON orders;
DROP POLICY IF EXISTS "orders_realtime" ON orders;

-- 3. SECURE TRIGGER FUNCTIONS (Addresses 1 error)
-- SECURITY DEFINER functions must have a search_path to prevent identity spoofing.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.phone, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public; -- Security Fix

-- 4. ENSURE ROBUST POLICIES FOR CORE TABLES
-- These ensure that even after enabling RLS, legitimate users can still work.

-- Products
DROP POLICY IF EXISTS "Products: View" ON products;
CREATE POLICY "Products: View" ON products FOR SELECT 
    USING (is_available = true);

DROP POLICY IF EXISTS "Products: Manage" ON products;
CREATE POLICY "Products: Manage" ON products FOR ALL 
    USING (is_admin());

-- Categories
DROP POLICY IF EXISTS "Categories: View" ON categories;
CREATE POLICY "Categories: View" ON categories FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Categories: Manage" ON categories;
CREATE POLICY "Categories: Manage" ON categories FOR ALL 
    USING (is_admin());

-- Orders (Strict Access)
-- Note: Staff see all, users see only their own.
-- There is NO 'true' policy here anymore.
DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT 
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_select_staff" ON orders;
CREATE POLICY "orders_select_staff" ON orders FOR SELECT 
    USING (is_staff());

COMMIT;
