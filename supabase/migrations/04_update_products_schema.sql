-- Update products table to support new features
-- Run this in Supabase SQL Editor

-- 1. Add category_id FK (Changed to TEXT to match existing categories table)
alter table products 
add column if not exists category_id text references categories(id);

-- 2. Add subtitle (for short descriptions on cards)
alter table products 
add column if not exists subtitle text;

-- 3. Add description (long text)
alter table products 
add column if not exists description text;

-- 4. Add variants (JSON structure for sizes/prices)
alter table products 
add column if not exists variants jsonb default '[]'::jsonb;

-- 5. Ensure RLS allows Admin updates (using existing policies or adding new ones if needed)
-- (Assuming basic policies exist, otherwise we add them)
create policy "Authenticated users can insert products"
  on products for insert
  with check ( auth.role() = 'authenticated' );

create policy "Authenticated users can update products"
  on products for update
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete products"
  on products for delete
  using ( auth.role() = 'authenticated' );
