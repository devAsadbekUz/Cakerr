-- Add column to track when to auto-delete completed order Telegram messages
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_tg_delete_at TIMESTAMPTZ;

-- Index for efficient cron query
CREATE INDEX IF NOT EXISTS idx_orders_tg_delete_at
    ON orders(client_tg_delete_at)
    WHERE client_tg_delete_at IS NOT NULL;
