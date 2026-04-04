-- Migration: 85_fix_public_rls_exposure.sql
-- Remove overly permissive USING (true) RLS policies that expose all orders and
-- profiles to anonymous users. Proper user-scoped and staff-scoped SELECT policies
-- already exist from migrations 39 and 44 and remain untouched.
-- Realtime subscriptions continue to work for authenticated users via those policies.

BEGIN;

-- 1. Drop the permissive orders policies added in migrations 56 and 61
DROP POLICY IF EXISTS "public_realtime_orders" ON public.orders;
DROP POLICY IF EXISTS "orders_realtime" ON public.orders;

-- 2. Drop the permissive profiles policy added in migration 56
DROP POLICY IF EXISTS "public_realtime_profiles" ON public.profiles;

-- 3. Revoke the anonymous SELECT grants added in migration 56
REVOKE SELECT ON public.orders FROM anon;
REVOKE SELECT ON public.profiles FROM anon;

COMMIT;
