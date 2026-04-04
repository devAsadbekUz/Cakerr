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

