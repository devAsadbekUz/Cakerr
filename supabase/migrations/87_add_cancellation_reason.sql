-- 87_add_cancellation_reason.sql
-- Adds a cancellation_reason column to orders so admins can record why an
-- already-confirmed order was cancelled. NULL means no reason was recorded
-- (order was new when cancelled, or reason was not provided).

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN public.orders.cancellation_reason IS
    'Reason recorded when an order is cancelled after confirmation. NULL for new-status cancellations or when no reason was given.';
