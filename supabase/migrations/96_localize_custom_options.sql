-- Localize custom cake options to support both Uzbek and Russian languages
ALTER TABLE custom_cake_options RENAME COLUMN label TO label_uz;
ALTER TABLE custom_cake_options RENAME COLUMN sub_label TO sub_label_uz;

ALTER TABLE custom_cake_options ADD COLUMN label_ru TEXT;
ALTER TABLE custom_cake_options ADD COLUMN sub_label_ru TEXT;

-- Seed RU labels from UZ as a starting point so existing data isn't blank
UPDATE custom_cake_options SET label_ru = label_uz, sub_label_ru = sub_label_uz;

-- Ensure required columns are NOT NULL for labels (UZ must exist)
ALTER TABLE custom_cake_options ALTER COLUMN label_uz SET NOT NULL;
