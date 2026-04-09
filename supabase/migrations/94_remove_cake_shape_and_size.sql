-- Migration: Remove Shape and Size from Custom Cake Options
-- Description: Deletes all entries with type 'shape' or 'size' as they are no longer used in the streamlined flow.

DELETE FROM custom_cake_options 
WHERE type IN ('shape', 'size');
