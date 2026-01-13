-- 21. Availability Overrides Table
CREATE TABLE availability_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  slot TEXT, -- NULL means the whole day is blocked
  is_available BOOLEAN DEFAULT FALSE, -- FALSE means "crossed"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, slot) -- Prevents duplicate overrides for the same slot/day
);

-- RLS Policies
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability overrides" 
  ON availability_overrides FOR SELECT 
  USING (true);

CREATE POLICY "Admins/Bakers can manage availability overrides" 
  ON availability_overrides FOR ALL 
  USING (is_staff());
