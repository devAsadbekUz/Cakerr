-- Reset all existing custom cake option prices to 0
-- This aligns the data with the new spec-only ordering flow where price is determined manually.
UPDATE custom_cake_options SET price = 0;
