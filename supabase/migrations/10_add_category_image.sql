-- Add image_url column to categories table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='image_url') THEN
    ALTER TABLE categories ADD COLUMN image_url TEXT;
  END IF;
END $$;
