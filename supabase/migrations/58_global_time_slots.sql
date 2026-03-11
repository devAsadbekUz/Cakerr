-- 58. Global Time Slots
-- Replaces hardcoded TIME_SLOTS array in frontend.
-- Admin manages these globally. Per-date blocking still uses availability_overrides.

CREATE TABLE IF NOT EXISTS global_time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,      -- e.g. "09:00 - 11:00"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with the 6 existing hardcoded slots so nothing breaks
INSERT INTO global_time_slots (label, sort_order) VALUES
  ('09:00 - 11:00', 1),
  ('11:00 - 13:00', 2),
  ('13:00 - 15:00', 3),
  ('15:00 - 17:00', 4),
  ('17:00 - 19:00', 5),
  ('19:00 - 21:00', 6)
ON CONFLICT (label) DO NOTHING;

-- RLS
ALTER TABLE global_time_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can read slots (needed for checkout page)
CREATE POLICY "Anyone can view global time slots"
  ON global_time_slots FOR SELECT
  USING (true);

-- Only admins can manage slots (reuses existing is_staff() helper)
CREATE POLICY "Admins can manage global time slots"
  ON global_time_slots FOR ALL
  USING (is_staff());
