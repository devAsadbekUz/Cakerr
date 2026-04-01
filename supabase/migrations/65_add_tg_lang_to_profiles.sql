-- Add tg_lang column to profiles to store the user's Telegram app language.
-- Used to send bot messages (welcome, order notifications) in the user's preferred language.
-- Non-breaking: nullable with a default of 'uz'.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tg_lang text NOT NULL DEFAULT 'uz'
CHECK (tg_lang IN ('uz', 'ru'));
