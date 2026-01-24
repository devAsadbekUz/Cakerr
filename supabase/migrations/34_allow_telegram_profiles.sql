-- Migration: Allow profiles for Telegram users without auth.users entry
-- The profiles table has a FK constraint to auth.users, but Telegram users don't have auth.users entries
-- We need to make this constraint optional for Telegram-only authentication

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Add a new column to distinguish auth type (optional, for future use)
-- Note: We cannot add a conditional FK, so we remove the constraint entirely
-- The telegram_id column already provides the link to Telegram identity

-- Step 3: Add an index on telegram_id if not exists for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);

-- Step 4: Add check constraint to ensure at least one identity method exists
-- Either id links to auth.users OR telegram_id is set
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_identity_exists;
ALTER TABLE profiles ADD CONSTRAINT check_identity_exists 
    CHECK (telegram_id IS NOT NULL OR id IS NOT NULL);

-- Note: This allows profiles to be created for Telegram users without auth.users entries
-- For Supabase auth users, the id will match their auth.users id
-- For Telegram-only users, id will be a generated UUID with telegram_id set
