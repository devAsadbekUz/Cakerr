-- Telegram OTP Auth Migration
-- Adds tables for OTP-based authentication via Telegram

-- 1. Table to store phone -> telegram chat_id mappings
-- Users must start the bot and share their contact to link their phone
CREATE TABLE IF NOT EXISTS telegram_phone_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    telegram_id BIGINT NOT NULL,
    telegram_chat_id BIGINT NOT NULL,
    telegram_username TEXT,
    first_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_links_phone ON telegram_phone_links(phone);
CREATE INDEX IF NOT EXISTS idx_phone_links_telegram ON telegram_phone_links(telegram_id);

-- 2. Table to store OTP codes
CREATE TABLE IF NOT EXISTS telegram_otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON telegram_otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON telegram_otp_codes(expires_at);

-- 3. Enable RLS
ALTER TABLE telegram_phone_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_otp_codes ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically
DROP POLICY IF EXISTS "Deny anon access phone_links" ON telegram_phone_links;
CREATE POLICY "Deny anon access phone_links" ON telegram_phone_links
    FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny anon access otp" ON telegram_otp_codes;
CREATE POLICY "Deny anon access otp" ON telegram_otp_codes
    FOR ALL USING (false);
