-- Migration: 61_fix_orders_realtime.sql
-- Description: Robustly re-enable Realtime and replication for the 'orders' table
-- This ensures that updates from any source (Telegram Webhook, Admin DB, etc.) are broadcasted to the web client.

-- 1. Ensure the table is in the supabase_realtime publication
DO $$
BEGIN
    -- Try to add the table. If it's already there, this will fail gracefully in a sub-block if needed,
    -- but usually, we can just check if it's already in the publication.
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;
END $$;

-- 2. Ensure REPLICA IDENTITY is set to FULL
-- This ensures that the 'old' record is available in the payload if needed, 
-- and more importantly, that the event is triggered reliably.
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 3. Ensure the Realtime 'SELECT' policy is robust
DROP POLICY IF EXISTS "orders_realtime" ON orders;
CREATE POLICY "orders_realtime" ON orders FOR SELECT
    USING (true);

-- 4. Enable Realtime specifically for this table if not already
-- This is a hint to the Supabase infrastructure
COMMENT ON TABLE orders IS 'realtime:enabled';
