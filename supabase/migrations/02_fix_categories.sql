-- Robust fix for Categories Table
-- Run this in Supabase SQL Editor

-- 1. Ensure RLS is enabled
alter table if exists categories enable row level security;

-- 2. Ensure ID generates automatically (Fixing potential missing default)
alter table categories 
  alter column id set default gen_random_uuid();

-- 3. DROP existing policies to avoid conflicts (Idempotency)
drop policy if exists "Public categories are viewable by everyone" on categories;
drop policy if exists "Authenticated users can insert categories" on categories;
drop policy if exists "Authenticated users can update categories" on categories;
drop policy if exists "Authenticated users can delete categories" on categories;

-- 4. Re-create Policies
create policy "Public categories are viewable by everyone"
  on categories for select
  using ( true );

create policy "Authenticated users can insert categories"
  on categories for insert
  with check ( auth.role() = 'authenticated' );

create policy "Authenticated users can update categories"
  on categories for update
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete categories"
  on categories for delete
  using ( auth.role() = 'authenticated' );
