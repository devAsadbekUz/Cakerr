-- Initial Products Seed with Correct Variant Prices
-- Variant 'price' should be the TOTAL price for that variant, not a modifier.

-- Delete existing to avoid duplicates if re-run
DELETE FROM products WHERE title IN ('Rainbow Splash', 'Classic Chocolate', 'Elegant White Tier', 'Floral Cascading', 'Dino Adventure');

INSERT INTO products (title, description, base_price, image_url, category, variants)
VALUES 
(
  'Rainbow Splash', 
  'Klassik kamalak rangli tort. Siz faqat porsiya miqdorini tanlaysiz va buyurtma berasiz!', 
  250000, 
  'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=800&q=80', 
  'birthday',
  '[
    {"id": "v1", "value": "2", "price": 250000},
    {"id": "v2", "value": "4", "price": 450000},
    {"id": "v3", "value": "6", "price": 650000}
  ]'::jsonb
),
(
  'Classic Chocolate', 
  'Shokoladni sevuvchilar uchun maxsus tayyorlangan tort.', 
  220000, 
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', 
  'birthday',
  '[
    {"id": "v4", "value": "2", "price": 220000},
    {"id": "v5", "value": "4", "price": 400000}
  ]'::jsonb
),
(
  'Elegant White Tier', 
  'To''ylar uchun nafis oq tort.', 
  850000, 
  'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=800&q=80', 
  'wedding',
  '[{"id": "v6", "value": "10", "price": 850000}]'::jsonb
),
(
  'Floral Cascading', 
  'Gullar bilan bezatilgan to''y torti.', 
  920000, 
  'https://images.unsplash.com/photo-1546815670-6927d2c3df31?auto=format&fit=crop&w=800&q=80', 
  'wedding',
  '[{"id": "v7", "value": "12", "price": 920000}]'::jsonb
),
(
  'Dino Adventure', 
  'Bolajonlar uchun dinozavrli tort.', 
  300000, 
  'https://images.unsplash.com/photo-1559553156-2e97137af16f?auto=format&fit=crop&w=800&q=80', 
  'kids',
  '[{"id": "v8", "value": "4", "price": 300000}]'::jsonb
);
