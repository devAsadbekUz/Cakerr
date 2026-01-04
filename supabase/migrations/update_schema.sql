-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, -- 'birthday', 'wedding', etc.
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
-- Allow admins to manage categories
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (is_admin());

-- Update products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0;

-- Ensure variants is treated as jsonb (it was already created as jsonb in init_schema, but good to be safe/explicit if we were altering)
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB;
