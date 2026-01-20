-- Force Enable Realtime for Orders Table (Corrected)
-- Run this in Supabase Dashboard > SQL Editor to fix sync issues

DO $$
BEGIN
    -- 1. Safely remove from publication (resets it)
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE orders;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Updates if it wasn't there, just ignore
    END;

    -- 2. Add it back cleanly
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
END $$;

-- 3. Ensure full data is sent on updates
ALTER TABLE orders REPLICA IDENTITY FULL;
