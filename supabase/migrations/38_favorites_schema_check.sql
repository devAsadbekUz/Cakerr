-- Migration: Favorites Persistence Audit
-- Ensures favorites table exists and is accessible to the current auth flow.

DO $$ 
BEGIN
    -- 1. Ensure table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorites') THEN
        CREATE TABLE favorites (
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (user_id, product_id)
        );
    END IF;

    -- 2. Ensure RLS is enabled
    ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

    -- 3. Ensure policies exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Users can view their own favorites') THEN
        CREATE POLICY "Users can view their own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Users can add their own favorites') THEN
        CREATE POLICY "Users can add their own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Users can remove their own favorites') THEN
        CREATE POLICY "Users can remove their own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);
    END IF;

END $$;
