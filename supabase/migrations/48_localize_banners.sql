-- Migration to localize hero_banners content
-- Converts existing plain text to JSON format {"uz": "...", "ru": "..."}

UPDATE hero_banners
SET 
  badge_text = jsonb_build_object('uz', badge_text, 'ru', badge_text)::text,
  title_text = jsonb_build_object('uz', title_text, 'ru', title_text)::text,
  button_text = jsonb_build_object('uz', button_text, 'ru', button_text)::text
WHERE 
  badge_text NOT LIKE '{%' OR 
  title_text NOT LIKE '{%' OR 
  button_text NOT LIKE '{%';
