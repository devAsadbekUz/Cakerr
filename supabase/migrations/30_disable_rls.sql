-- DIAGNOSTIC: Disable RLS on Orders
-- This turns off all permission checks for this table.
-- Use this ONLY to verify if RLS is the cause of 'CHANNEL_ERROR'.

BEGIN;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
COMMIT;
