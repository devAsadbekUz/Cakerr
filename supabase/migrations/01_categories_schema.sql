-- Create categories table
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  label text not null,
  icon text
);

-- Enable Row Level Security
alter table categories enable row level security;

-- Create policies
-- 1. Allow public read access (so customers can see categories on Home Page)
create policy "Public categories are viewable by everyone"
  on categories for select
  using ( true );

-- 2. Allow specific users to insert/update/delete
-- Note: Ideally this checks for a role, but for now we allow any authenticated user (Admin Login)
create policy "Authenticated users can insert categories"
  on categories for insert
  with check ( auth.role() = 'authenticated' );

create policy "Authenticated users can update categories"
  on categories for update
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete categories"
  on categories for delete
  using ( auth.role() = 'authenticated' );
