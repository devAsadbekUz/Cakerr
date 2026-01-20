-- Create hero banners table
CREATE TABLE IF NOT EXISTS hero_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    badge_text TEXT NOT NULL,
    title_text TEXT NOT NULL,
    button_text TEXT NOT NULL DEFAULT 'Buyurtma berish',
    link_url TEXT DEFAULT '/',
    bg_color TEXT DEFAULT '#BE185D',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active banners" ON hero_banners
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage banners" ON hero_banners
    FOR ALL USING (is_admin());

-- Insert initial banner
INSERT INTO hero_banners (badge_text, title_text, button_text, bg_color)
VALUES ('🎉 Yangi mahsulotlar', '30% chegirma barcha tortlarga', 'Buyurtma berish', '#BE185D');
