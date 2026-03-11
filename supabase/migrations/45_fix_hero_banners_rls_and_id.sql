-- Migration: Fix Hero Banners RLS and ID Generation
-- Ensuring compatibility with standard Supabase environments

BEGIN;

-- 1. Update ID generation to use gen_random_uuid() (standard for pgcrypto/Supabase)
-- Note: We're not changing existing IDs, just the default for new ones.
ALTER TABLE hero_banners 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Ensure RLS is enabled
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- 3. DROP old policies to recreate them cleanly
DROP POLICY IF EXISTS "Anyone can view active banners" ON hero_banners;
DROP POLICY IF EXISTS "Admins can manage banners" ON hero_banners;

-- 4. Re-create View Policy (for customers)
CREATE POLICY "Anyone can view active banners" ON hero_banners
    FOR SELECT USING (is_active = true);

-- 5. Re-create Admin Management Policy
-- We use is_admin() but also fallback to checking the role directly if possible
CREATE POLICY "Admins can manage banners" ON hero_banners
    FOR ALL USING (
        is_admin() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'::user_role
        )
    );

COMMIT;
