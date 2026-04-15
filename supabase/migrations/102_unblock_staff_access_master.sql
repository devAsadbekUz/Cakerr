-- Migration: 102_unblock_staff_access_master.sql
-- Description: Comprehensive RLS unblocker for authorized staff members.
-- This grants the service_role (used by our server-side admin routes) full bypass
-- on all core administrative tables and storage buckets.

BEGIN;

-- ============================================================================
-- 1. DATABASE TABLES
-- ============================================================================

DO $$
DECLARE
    t text;
    tables_to_fix text[] := ARRAY[
        'products', 
        'categories', 
        'orders', 
        'order_items', 
        'availability_overrides', 
        'custom_cake_options', 
        'custom_cake_option_relations',
        'hero_banners',
        'profiles',
        'app_settings',
        'coin_transactions',
        'admin_messages'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_fix LOOP
        -- Check if table exists in public schema
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Drop existing bypass policy if it exists (using various naming conventions found in previous migrations)
            EXECUTE format('DROP POLICY IF EXISTS "Service Role Bypass" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Service Role Bypass Policy" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_service_role_bypass', t);
            EXECUTE format('DROP POLICY IF EXISTS "Products: Service Role Bypass" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Categories: Service Role Bypass" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Banners: Service Role Bypass" ON %I', t);

            -- Create the Master Bypass Policy for service_role
            EXECUTE format('CREATE POLICY "Master Service Role Bypass" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
            
            RAISE NOTICE 'Applied Master Service Role Bypass to table: %', t;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping.', t;
        END IF;
    END LOOP;
END $$;


-- ============================================================================
-- 2. STORAGE BUCKETS
-- ============================================================================

-- Ensure the service_role has full management rights on administrative buckets.
-- Our new server-side upload system uses the service role to bypass guest RLS.

-- images bucket
DROP POLICY IF EXISTS "Service Role Storage Bypass" ON storage.objects;
CREATE POLICY "Service Role Storage Bypass" 
ON storage.objects FOR ALL 
TO service_role 
USING (bucket_id IN ('images', 'custom-cakes')) 
WITH CHECK (bucket_id IN ('images', 'custom-cakes'));

COMMIT;
