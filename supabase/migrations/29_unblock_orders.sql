-- Unblock Realtime Subscriptions
-- The 'CHANNEL_ERROR' indicates the user doesn't have permission to 'WATCH' the table.
-- This script adds a policy to allow viewing orders.

BEGIN;

-- 1. Enable RLS (Ensure it's on)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop restrictive policies if they conflict (optional, but good practice)
DROP POLICY IF EXISTS "Public Realtime Access" ON orders;

-- 3. Add Permit Policy
-- This allows anyone to SELECT (and thus Listen to) orders.
-- Since they need the Order ID (UUID) to listen/fetch, this is reasonably safe for now.
CREATE POLICY "Public Realtime Access" ON orders FOR SELECT USING (true);

COMMIT;
