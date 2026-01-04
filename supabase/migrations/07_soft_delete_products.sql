-- Implement Soft Delete
-- Run this in Supabase SQL Editor

-- 1. Add deleted_at column
alter table products 
add column if not exists deleted_at timestamp with time zone;

-- 2. Update existing rows (ensure it is null)
-- (Default is null anyway, but good to be explicit)
