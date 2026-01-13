-- Enable Supabase Realtime for the 'orders' table
-- This allows the frontend to receive instant 'UPDATE' events for order statuses

-- 1. Add the table to the realtime publication
-- Note: If the publication doesn't exist, Supabase will create it automatically when you use the UI, 
-- but we'll try to add it here.
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 2. Ensure the full record is sent in the event payload
ALTER TABLE orders REPLICA IDENTITY FULL;
