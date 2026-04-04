-- 1. ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_type') THEN
        CREATE TYPE delivery_type AS ENUM ('delivery', 'pickup');
    END IF;
END $$;

-- 2. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_uz TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    address_uz TEXT NOT NULL,
    address_ru TEXT NOT NULL,
    location_link TEXT, -- Google Maps link
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORDERS TABLE UPDATES
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type delivery_type DEFAULT 'delivery';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- 4. SEED INITIAL BRANCHES (As per user request for 2 branches)
INSERT INTO branches (name_uz, name_ru, address_uz, address_ru, location_link)
VALUES 
('Bosh Filial', 'Главный Филиал', 'Toshkent sh., Yunusobod tumani', 'г. Ташкент, Юнусабадский район', 'https://maps.google.com/?q=41.3384,69.2846'),
('Chilonzor Filiali', 'Филиал Чиланзар', 'Toshkent sh., Chilonzor tumani', 'г. Ташкент, Чиланзарский район', 'https://maps.google.com/?q=41.2721,69.2033')
ON CONFLICT DO NOTHING;

-- 5. RLS FOR BRANCHES
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active branches" 
ON branches FOR SELECT 
USING (is_active = TRUE);

CREATE POLICY "Admins can manage branches" 
ON branches FOR ALL 
USING (is_admin());
