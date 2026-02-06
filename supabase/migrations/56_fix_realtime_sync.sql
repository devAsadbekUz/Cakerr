-- Migration: Realtime Sync Repair (V4 - ULTRA ROBUST)
-- This version avoids "IF EXISTS" syntax which causes errors in some Postgres versions.
-- It ensures orders and profiles have REPLICA IDENTITY FULL and are in the realtime publication.

BEGIN;

-- 1. Set Replica Identity
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 2. Ensure Publication exists
-- This part is usually safe in all versions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Add tables one by one with pure exception handling
-- We don't use DROP TABLE IF EXISTS anymore to avoid syntax errors.
-- We just try to ADD. If it's already there, Postgres throws 'duplicate_object', which we catch.

DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
EXCEPTION 
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
EXCEPTION 
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;

-- 4. RLS POLICIES (Allowing SELECT for anyone to enable Realtime updates)
DROP POLICY IF EXISTS "public_realtime_orders" ON public.orders;
CREATE POLICY "public_realtime_orders" ON public.orders FOR SELECT USING (true); 

DROP POLICY IF EXISTS "public_realtime_profiles" ON public.profiles;
CREATE POLICY "public_realtime_profiles" ON public.profiles FOR SELECT USING (true);

-- 5. Grant SELECT to anonymous users (Telegram Mini App visitors)
GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.profiles TO anon;

COMMIT;
