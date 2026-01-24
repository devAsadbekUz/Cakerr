-- Telegram Auth Migration
-- Adds telegram_id to profiles and creates session storage

-- 1. Add telegram_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- 2. Create session storage for Telegram users
CREATE TABLE IF NOT EXISTS telegram_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL,
    token TEXT UNIQUE NOT NULL,
    telegram_id BIGINT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tg_sessions_token ON telegram_sessions(token);
CREATE INDEX IF NOT EXISTS idx_tg_sessions_profile ON telegram_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_tg_sessions_expires ON telegram_sessions(expires_at);

-- 4. Enable RLS but allow service role full access
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically, so no policy needed for it
-- But we add a restrictive policy for anon role (deny all)
DROP POLICY IF EXISTS "Deny anon access" ON telegram_sessions;
CREATE POLICY "Deny anon access" ON telegram_sessions
    FOR ALL
    USING (false);
