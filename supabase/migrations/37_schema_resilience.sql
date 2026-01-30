-- Migration: Schema Resilience Audit
-- This migration ensures all tables have the columns and defaults expected by the application code.

-- 1. Ensure Profiles table is complete
DO $$ 
BEGIN
    -- Ensure columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE profiles ADD COLUMN username TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'telegram_id') THEN
        ALTER TABLE profiles ADD COLUMN telegram_id BIGINT UNIQUE;
    END IF;

    -- Ensure id has default value (already done in 35, but here for resilience)
    ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    -- Ensure constraints
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'profiles' AND constraint_name = 'check_identity_exists') THEN
        ALTER TABLE profiles ADD CONSTRAINT check_identity_exists CHECK (telegram_id IS NOT NULL OR id IS NOT NULL);
    END IF;
END $$;

-- 2. Ensure Orders table is complete
DO $$ 
BEGIN
    -- Ensure status enum has 'ready' (already done in 20, but here for resilience)
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'order_status' AND e.enumlabel = 'ready') THEN
        ALTER TYPE order_status ADD VALUE 'ready' AFTER 'preparing';
    END IF;

    -- Ensure Telegram sync columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'telegram_message_id') THEN
        ALTER TABLE orders ADD COLUMN telegram_message_id BIGINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'telegram_chat_id') THEN
        ALTER TABLE orders ADD COLUMN telegram_chat_id BIGINT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_slot') THEN
        ALTER TABLE orders ADD COLUMN delivery_slot TEXT;
    END IF;
END $$;

-- 3. Profiles RLS Fix for Telegram Users
-- Since Telegram users don't have an auth.users entry, auth.uid() is null for them.
-- If they are authenticated via our custom Telegram initData (handled by API routes), 
-- they should still be able to see their own profile if we ever exposed it via client SDK.
-- For now, the backend uses service_role, so it works. 
-- But adding a policy for future-proofing is good.
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles 
    FOR SELECT USING (auth.uid() = id OR (telegram_id IS NOT NULL AND telegram_id = (SELECT (auth.jwt() ->> 'telegram_id')::bigint)));

-- Note: The above policy assumes we might set telegram_id in a custom JWT or claim. 
-- Since we are not doing that yet, service_role is our primary way.
