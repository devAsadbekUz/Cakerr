-- Customer refresh tokens
-- Stores SHA-256 hashes of long-lived refresh tokens (1 year).
-- The raw token is returned to the client once and never stored here.
-- One active token per user: /api/user/me replaces any existing token on each Telegram open.

CREATE TABLE IF NOT EXISTS customer_refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ          -- set on logout; token is permanently dead after this
);

CREATE INDEX IF NOT EXISTS idx_crt_token_hash  ON customer_refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_crt_profile_id  ON customer_refresh_tokens (profile_id);

-- No RLS needed: this table is only accessed via the service-role key in API routes.
-- Direct client access is intentionally blocked.
ALTER TABLE customer_refresh_tokens DISABLE ROW LEVEL SECURITY;
