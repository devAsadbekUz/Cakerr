-- Add column to store the client-side notification message ID
-- This allows us to delete/replace previous status messages to keep the chat clean
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_tg_message_id BIGINT;
