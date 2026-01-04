-- 4. Add other missing columns (Standard part)
alter table products add column if not exists subtitle text;
alter table products add column if not exists description text;
alter table products add column if not exists variants jsonb default '[]'::jsonb;

-- Ensure numeric/text columns exist for form data
alter table products add column if not exists price numeric;
alter table products add column if not exists base_price numeric;
alter table products add column if not exists image_url text;
alter table products add column if not exists category text; -- Denormalized label
