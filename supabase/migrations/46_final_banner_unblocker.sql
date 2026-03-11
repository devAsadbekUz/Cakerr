-- FINAL FIX: Fully Unblock Hero Banners Management
-- Run this in Supabase SQL Editor if deletion is still blocked.

BEGIN;

-- 1. Ensure the owner email is ALWAYS an admin in the profiles table
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE LOWER(email) = 'moida.buvayda@gmail.com';

-- 2. DISABLE RLS on hero_banners as a final resort
-- This matches the pattern in "16_ultimate_admin_unblocker.sql" 
-- where RLS was disabled for other core admin tables.
ALTER TABLE hero_banners DISABLE ROW LEVEL SECURITY;

-- 3. Verify the role for the current user (if logged in as owner)
-- The profiles table should now correctly report 'admin' for this email.

COMMIT;
