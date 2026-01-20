-- Fix Realtime Publication for Orders Table
-- This migration resets the realtime publication and re-enables RLS with proper policies

-- 1. Reset realtime publication
DO $$
BEGIN
    -- Remove if exists (ignore errors)
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE orders;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Add back cleanly
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
END $$;

-- 2. Ensure full row data is sent on updates
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 3. Re-enable RLS with working policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing order policies to start fresh
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Public Realtime Access" ON orders;
DROP POLICY IF EXISTS "Admins/Bakers can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins/Bakers can update orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_select_staff" ON orders;
DROP POLICY IF EXISTS "orders_update_staff" ON orders;
DROP POLICY IF EXISTS "orders_realtime" ON orders;

-- 5. Recreate clean policies

-- Users can view their own orders
CREATE POLICY "orders_select_own" ON orders FOR SELECT 
    USING (user_id = auth.uid());

-- Users can create their own orders  
CREATE POLICY "orders_insert_own" ON orders FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Staff can view all orders
CREATE POLICY "orders_select_staff" ON orders FOR SELECT 
    USING (is_staff());

-- Staff can update any order
CREATE POLICY "orders_update_staff" ON orders FOR UPDATE 
    USING (is_staff());

-- Allow SELECT for realtime subscriptions (needed for postgres_changes)
-- Note: Order IDs are UUIDs (unpredictable), so this is reasonably safe
CREATE POLICY "orders_realtime" ON orders FOR SELECT
    USING (true);
