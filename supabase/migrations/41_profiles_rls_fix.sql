-- Migration: Profiles RLS Fix
-- This migration allows users to see their own profile data (for coins and roles)
-- and ensures staff can manage all profiles.

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 3. Create robust policies
-- Users can always view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Staff (Admins and Bakers) can view all profiles for management
CREATE POLICY "Staff can view all profiles" ON public.profiles
    FOR SELECT USING (is_staff());

-- Admins can manage everything
CREATE POLICY "Admins can manage profiles" ON public.profiles
    FOR ALL USING (is_admin());

COMMIT;
