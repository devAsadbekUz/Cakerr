-- Description: Adds parent_id to custom_cake_options to support hierarchical filtering (Cake Type -> Nachinka/Size)
-- Also migrates legacy sponge/cream types to 'nachinka'

-- 1. Add parent_id column
ALTER TABLE custom_cake_options 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES custom_cake_options(id) ON DELETE SET NULL;

-- 2. Migrate legacy 'sponge' and 'cream' types to 'nachinka' (Ingredients)
-- We do this so the admin doesn't have to start from scratch
UPDATE custom_cake_options 
SET type = 'nachinka' 
WHERE type IN ('sponge', 'cream');

-- 3. Ensure we have the basic types in mind: 'cake_type', 'nachinka', 'size', 'decoration'
-- (No strict enum constraint in existing schema, so we just use these strings in code)

-- 4. Re-enable RLS policy to ensure parent_id is selectable
-- (Select policy usually covers all columns, so no change needed to existing policies)

COMMENT ON COLUMN custom_cake_options.parent_id IS 'Points to the parent cake_type that this option belongs to factor filtering.';
