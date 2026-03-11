-- Migration: Add RPC for batch banner order updates
-- This allows updating multiple banners' sort orders in a single transaction.

BEGIN;

CREATE OR REPLACE FUNCTION update_banners_order(new_orders JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    banner_record RECORD;
BEGIN
    FOR banner_record IN SELECT * FROM jsonb_to_recordset(new_orders) AS x(id UUID, sort_order INT)
    LOOP
        UPDATE hero_banners
        SET sort_order = banner_record.sort_order
        WHERE id = banner_record.id;
    END LOOP;
END;
$$;

COMMIT;
