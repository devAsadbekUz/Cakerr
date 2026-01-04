-- Seed Categories
INSERT INTO categories (id, label, icon) VALUES
('birthday', 'Tug''ilgan kun', '/icons/birthday.png'),
('wedding', 'To''y', '/icons/wedding.png'),
('anniversary', 'Yilliklar', '/icons/anniversary.png'),
('kids', 'Bolajon', '/icons/kids.png'),
('joy', 'Shodlik', '/icons/joy.png'),
('love', 'Muhabbat', '/icons/love.png'),
('custom', 'Maxsus tortlar', '/icons/custom.png')
ON CONFLICT (id) DO NOTHING;

-- Seed Products
-- We use a temporary function to insert products to handle the JSONB nesting cleanly
DO $$
DECLARE
  v_birthday_id text := 'birthday';
  v_wedding_id text := 'wedding';
  v_anniversary_id text := 'anniversary';
  v_kids_id text := 'kids';
  v_joy_id text := 'joy';
  v_love_id text := 'love';
BEGIN

-- Birthday Cakes
INSERT INTO products (title, description, base_price, image_url, category, rating, reviews, details, variants) VALUES
(
  'Rainbow Splash',
  'Bu tayyor tort. Siz faqat porsiya miqdorini tanlaysiz va buyurtma berasiz!',
  250000,
  'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=800&q=80',
  'birthday',
  4.8,
  124,
  '{"shapes": ["Dumaloq"], "flavors": ["Vanilli"], "coating": ["Cream Cheese"], "innerCoating": ["Meva"], "decorations": [" sprinkles", "Kamalak"]}',
  '[{"id": "v1", "value": "2", "label": "kishilik", "price": 250000}, {"id": "v2", "value": "4", "label": "kishilik", "price": 450000}, {"id": "v3", "value": "6", "label": "kishilik", "price": 650000}]'
),
(
  'Classic Chocolate Birthday',
  'Shokoladni sevuvchilar uchun maxsus tayyorlangan tort.',
  220000,
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
  'birthday',
  4.9,
  89,
  '{"shapes": ["Shkvadrat"], "flavors": ["Shokoladli"], "coating": ["Ganash"], "innerCoating": ["Shokolad krem"], "decorations": ["Gilos", "Oltin barg"]}',
  '[{"id": "v4", "value": "2", "label": "kishilik", "price": 220000}, {"id": "v5", "value": "4", "label": "kishilik", "price": 400000}]'
);

-- Wedding Cakes
INSERT INTO products (title, base_price, image_url, category, rating, reviews) VALUES
(
  'Elegant White Tier',
  850000,
  'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=800&q=80',
  'wedding',
  5.0,
  45
),
(
  'Floral Cascading',
  920000,
  'https://images.unsplash.com/photo-1546815670-6927d2c3df31?auto=format&fit=crop&w=800&q=80',
  'wedding',
  4.7,
  32
);

-- Anniversary
INSERT INTO products (title, base_price, image_url, category, rating, reviews) VALUES
(
  'Golden Jubilee',
  450000,
  'https://images.unsplash.com/photo-1562777717-dc698ae415bd?auto=format&fit=crop&w=800&q=80',
  'anniversary',
  4.8,
  56
),
(
  'Heart Red Velvet',
  380000,
  'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80',
  'anniversary',
  4.9,
  78
);

-- Kids
INSERT INTO products (title, base_price, image_url, category, rating, reviews) VALUES
(
  'Dino Adventure',
  300000,
  'https://images.unsplash.com/photo-1559553156-2e97137af16f?auto=format&fit=crop&w=800&q=80',
  'kids',
  4.8,
  112
),
(
  'Unicorn Dream',
  320000,
  'https://images.unsplash.com/photo-1517456209581-2c06637d7c65?auto=format&fit=crop&w=800&q=80',
  'kids',
  4.9,
  156
);

-- Joy
INSERT INTO products (title, base_price, image_url, category, rating, reviews) VALUES
(
  'Berry Blast',
  180000,
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
  'joy',
  4.7,
  90
),
(
  'Citrus Zest',
  195000,
  'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80',
  'joy',
  4.6,
  45
);

-- Love
INSERT INTO products (title, base_price, image_url, category, rating, reviews) VALUES
(
  'Chocolate Strawberry Kiss',
  280000,
  'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?auto=format&fit=crop&w=800&q=80',
  'love',
  4.9,
  200
),
(
  'Valentine''s Rose',
  350000,
  'https://images.unsplash.com/photo-1588195538326-c5f1f9fa4a5f?auto=format&fit=crop&w=800&q=80',
  'love',
  5.0,
  67
);

END $$;
