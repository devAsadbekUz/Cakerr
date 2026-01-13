-- Migration: Add 'ready' status to order_status enum
-- Since PostgreSQL doesn't allow adding a value to an enum within a transaction (easily), 
-- and Supabase migrations run in a certain way, we use this safe approach:

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready' AFTER 'preparing';
