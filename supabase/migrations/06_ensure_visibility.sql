-- Final Touch: Ensure visibility
-- Run this in Supabase SQL Editor

-- 1. Set default is_available = true
alter table products 
alter column is_available set default true;

-- 2. Update existing products to be available (if null)
update products 
set is_available = true 
where is_available is null;

-- 3. Ensure Public Read Policy for Products
-- (This is critical for unauthenticated users to see products)
drop policy if exists "Public products are viewable by everyone" on products;

create policy "Public products are viewable by everyone"
  on products for select
  using ( true );
