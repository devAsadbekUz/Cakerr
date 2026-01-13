-- Create a table to store configurable options for custom cakes
CREATE TABLE custom_cake_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'size', 'sponge', 'cream', 'decoration'
  label TEXT NOT NULL,
  sub_label TEXT, -- e.g., '30cm' for sizes
  image_url TEXT, -- for creams and optional for others
  price NUMERIC DEFAULT 0, -- base price for this option
  is_available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE custom_cake_options ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view available custom options" ON custom_cake_options 
  FOR SELECT USING (is_available = TRUE);

CREATE POLICY "Admins can manage custom options" ON custom_cake_options 
  FOR ALL USING (is_admin());

-- Seed initial data matching previous hardcoded config but migrated to the new structure
INSERT INTO custom_cake_options (type, label, sub_label, price, sort_order) VALUES
('size', 'Kichik (6 kishilik)', '20cm', 150000, 1),
('size', 'O''rtacha (10 kishilik)', '25cm', 250000, 2),
('size', 'Katta (15 kishilik)', '30cm', 350000, 3);

INSERT INTO custom_cake_options (type, label, price, sort_order) VALUES
('sponge', 'Vanilli', 0, 1),
('sponge', 'Shokoladli', 20000, 2),
('sponge', 'Qizil Baxmal', 30000, 3);

INSERT INTO custom_cake_options (type, label, price, sort_order) VALUES
('cream', 'Qaymoqli', 0, 1),
('cream', 'Mevali', 25000, 2),
('cream', 'Shokoladli', 30000, 3);

INSERT INTO custom_cake_options (type, label, price, sort_order) VALUES
('decoration', 'Mevalar', 20000, 1),
('decoration', 'Makaronlar', 35000, 2),
('decoration', 'Shamlar', 5000, 3);
