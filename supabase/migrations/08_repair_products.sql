-- MASTER REPAIR SCRIPT
-- Run this in Supabase SQL Editor to fix ALL schema issues

-- 1. Ensure 'deleted_at' exists
alter table products 
add column if not exists deleted_at timestamp with time zone;

-- 2. Ensure RLS allows updating 'deleted_at'
-- (We drop and recreate the update policy to be safe)
drop policy if exists "Authenticated users can update products" on products;

create policy "Authenticated users can update products"
  on products for update
  using ( auth.role() = 'authenticated' );

-- 3. Verify Product columns for Admin Form
alter table products add column if not exists price numeric;
alter table products add column if not exists base_price numeric;
alter table products add column if not exists image_url text;
alter table products add column if not exists variants jsonb default '[]'::jsonb;
alter table products add column if not exists is_available boolean default true;

-- 4. Enable RLS (just in case)
alter table products enable row level security;
