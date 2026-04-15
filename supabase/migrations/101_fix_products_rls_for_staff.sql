-- Migration: Fix Products & Categories RLS for Staff
-- Resolves "new row violates row-level security policy" for non-Supabase Auth users (Staff)
-- by ensuring service role bypass is robust and policies are correctly unified.

BEGIN;

-- 1. CLEANUP: PRODUCTS
-- Drop all legacy and potentially conflicting policies
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Products: Manage" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
DROP POLICY IF EXISTS "Service Role Bypass" ON public.products;

-- 2. CLEANUP: CATEGORIES & BANNERS
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Categories: Manage" ON public.categories;
DROP POLICY IF EXISTS "Service Role Bypass" ON public.categories;

DROP POLICY IF EXISTS "Admins can manage banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Banners: Manage" ON public.hero_banners;
DROP POLICY IF EXISTS "Service Role Bypass" ON public.hero_banners;

-- 3. CREATE ROBUST POLICIES: PRODUCTS
-- Unified policy for admins
CREATE POLICY "Products: Manage" ON public.products 
    FOR ALL 
    USING (is_admin())
    WITH CHECK (is_admin());

-- Explicit Service Role Bypass (Fallback safety net)
-- This ensures that serviceClient operations always succeed regardless of auth context
CREATE POLICY "Products: Service Role Bypass" ON public.products 
    FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 4. CREATE ROBUST POLICIES: CATEGORIES
CREATE POLICY "Categories: Manage" ON public.categories 
    FOR ALL 
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Categories: Service Role Bypass" ON public.categories 
    FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 5. CREATE ROBUST POLICIES: BANNERS
CREATE POLICY "Banners: View" ON public.hero_banners 
    FOR SELECT USING (true);

CREATE POLICY "Banners: Manage" ON public.hero_banners 
    FOR ALL 
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Banners: Service Role Bypass" ON public.hero_banners 
    FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 6. ENSURE RLS IS ENABLED (Just in case)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

COMMIT;
