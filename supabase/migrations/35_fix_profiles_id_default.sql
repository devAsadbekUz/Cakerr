-- Migration: Add default value to profiles.id for Telegram users
-- This allows creating profiles without manually specifying an ID
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
