-- Migration 90: Order Deposit & Payment System
--
-- Adds two payment checkpoints to the order pipeline:
--   1. Deposit — recorded when admin confirms the order (new → confirmed)
--   2. Final payment — recorded when admin completes the order (→ completed)
--
-- New columns on orders:
--   deposit_amount        — the recorded deposit (0 = not yet received / Telegram auto-set)
--   final_payment_amount  — recorded at completion, must equal total_price - deposit_amount
--   refund_needed         — auto-set when order is cancelled with deposit_amount > 0
--
-- New table order_payment_logs:
--   Immutable audit trail of every payment event (record, edit, final payment).

BEGIN;

-- ── 1. Extend orders table ────────────────────────────────────────────────────

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS deposit_amount       INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS final_payment_amount INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS refund_needed        BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Create order_payment_logs table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.order_payment_logs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    -- event_type values:
    --   'deposit_recorded'       — first deposit entry when order is confirmed
    --   'deposit_edited'         — admin changed the deposit amount later
    --   'final_payment_recorded' — final payment entered when order is completed
    event_type       TEXT        NOT NULL
                                 CHECK (event_type IN (
                                     'deposit_recorded',
                                     'deposit_edited',
                                     'final_payment_recorded'
                                 )),
    amount           INTEGER     NOT NULL,          -- new / current amount
    previous_amount  INTEGER,                       -- only populated for deposit_edited
    recorded_by_name TEXT        NOT NULL DEFAULT 'System',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-order lookups ordered by time
CREATE INDEX IF NOT EXISTS idx_order_payment_logs_order_created
    ON public.order_payment_logs (order_id, created_at DESC);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.order_payment_logs ENABLE ROW LEVEL SECURITY;

-- Service role (used by all API routes) has unrestricted access
CREATE POLICY "service_role_all_payment_logs"
    ON public.order_payment_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admins can read logs for orders they manage
CREATE POLICY "admin_read_payment_logs"
    ON public.order_payment_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'::user_role
        )
    );

-- ── 4. Enable Realtime for payment logs (optional, for live admin UI) ─────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_payment_logs;

COMMIT;
