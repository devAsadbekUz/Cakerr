-- Add columns to store Telegram message ID for syncing status updates
-- When admin updates order status, we can update the Telegram message

ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
