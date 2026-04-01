-- Migration: schedule RPC functions
-- Replaces N individual UPDATE calls with a single batch update for slot reordering,
-- and replaces 2 sequential SELECT+INSERT/DELETE calls with an atomic toggle.

-- ─── 1. Reorder global time slots in a single query ───────────────────────────
-- Called as: supabase.rpc('reorder_global_slots', { ordered_ids: [...] })
CREATE OR REPLACE FUNCTION reorder_global_slots(ordered_ids uuid[])
RETURNS void AS $$
BEGIN
  UPDATE global_time_slots
  SET sort_order = t.idx
  FROM unnest(ordered_ids) WITH ORDINALITY AS t(id, idx)
  WHERE global_time_slots.id = t.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. Atomic toggle for per-date slot overrides ─────────────────────────────
-- If the override already exists → deletes it (re-open).
-- If it doesn't exist → inserts it (close/block).
-- Returns JSON: { action: 'added'|'removed', id, slot, date }
-- Called as: supabase.rpc('toggle_availability_slot', { p_date: '2026-03-30', p_slot: '10:00 - 12:00' })
-- Pass p_slot as NULL to block/unblock the whole day.
CREATE OR REPLACE FUNCTION toggle_availability_slot(p_date date, p_slot text DEFAULT NULL)
RETURNS json AS $$
DECLARE
  existing_id uuid;
  new_id      uuid;
BEGIN
  SELECT id INTO existing_id
  FROM availability_overrides
  WHERE date = p_date
    AND (
      (p_slot IS NULL AND slot IS NULL) OR
      (p_slot IS NOT NULL AND slot = p_slot)
    );

  IF existing_id IS NOT NULL THEN
    DELETE FROM availability_overrides WHERE id = existing_id;
    RETURN json_build_object(
      'action', 'removed',
      'id',     existing_id,
      'slot',   p_slot,
      'date',   p_date
    );
  ELSE
    INSERT INTO availability_overrides (date, slot, is_available)
    VALUES (p_date, p_slot, false)
    RETURNING id INTO new_id;
    RETURN json_build_object(
      'action', 'added',
      'id',     new_id,
      'slot',   p_slot,
      'date',   p_date
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
