-- Migration: 68_add_cake_shapes.sql
-- Description: Seeds all standard cake shapes into custom_cake_options
-- as type = 'shape'. Admins toggle is_available to show/hide each shape
-- on the client side. Uses ON CONFLICT to be safely re-runnable.

-- The existing RLS on custom_cake_options already handles this:
--   SELECT: is_available = TRUE (clients see only active shapes)
--   ALL:    is_admin()          (admins can manage everything)
-- No new policies needed.

INSERT INTO custom_cake_options (type, label, sub_label, price, is_available, sort_order) VALUES
  ('shape', 'Yumaloq',      'Round',     0, TRUE,  1),
  ('shape', 'To''rtburchak','Square',    0, TRUE,  2),
  ('shape', 'Yurak',        'Heart',     0, TRUE,  3),
  ('shape', 'Oval',         'Oval',      0, TRUE,  4),
  ('shape', 'Aylana',       'Ring/Bundt',0, FALSE, 5),
  ('shape', 'Guldasta',     'Petal',     0, FALSE, 6),
  ('shape', 'Uchburchak',   'Triangle',  0, FALSE, 7),
  ('shape', 'Yulduz',       'Star',      0, FALSE, 8),
  ('shape', 'Olti burchak', 'Hexagon',   0, FALSE, 9),
  ('shape', 'Minora',       'Tower',     0, FALSE, 10),
  ('shape', 'Raqam',        'Number',    0, FALSE, 11),
  ('shape', 'Harf',         'Letter',    0, FALSE, 12)
ON CONFLICT DO NOTHING;
