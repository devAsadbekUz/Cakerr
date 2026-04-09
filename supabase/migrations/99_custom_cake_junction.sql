-- Description: Migration to Many-to-Many Relationships for Custom Cake Options
-- Creates a junction table for Cake Type -> Nachinka and Nachinka -> Size associations.

-- 1. Create the junction table
CREATE TABLE IF NOT EXISTS custom_cake_option_relations (
    parent_id UUID REFERENCES custom_cake_options(id) ON DELETE CASCADE,
    child_id UUID REFERENCES custom_cake_options(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_id, child_id)
);

-- 2. Migrate existing parent_id data (Many-to-One -> Many-to-Many)
INSERT INTO custom_cake_option_relations (parent_id, child_id)
SELECT parent_id, id 
FROM custom_cake_options 
WHERE parent_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Auto-link: Link ALL existing 'nachinka' options to ALL existing 'cake_type' options
-- This ensures the wizard doesn't become empty after the migration.
INSERT INTO custom_cake_option_relations (parent_id, child_id)
SELECT p.id, c.id
FROM custom_cake_options p
CROSS JOIN custom_cake_options c
WHERE p.type = 'cake_type' AND c.type = 'nachinka'
ON CONFLICT DO NOTHING;

-- 4. Auto-link: Link ALL existing 'size' options to ALL existing 'nachinka' options
-- (Since sizes were previously linked to cake_type, we now transition them into a more granular Size -> Nachinka/Cake Type model).
-- For now, link all sizes to all nachinkas as requested.
INSERT INTO custom_cake_option_relations (parent_id, child_id)
SELECT n.id, s.id
FROM custom_cake_options n
CROSS JOIN custom_cake_options s
WHERE n.type = 'nachinka' AND s.type = 'size'
ON CONFLICT DO NOTHING;

-- 5. Add a comment to the table
COMMENT ON TABLE custom_cake_option_relations IS 'Junction table for Many-to-Many associations between custom cake options.';

-- 6. Important: We KEEP parent_id in custom_cake_options for now but it will be ignored by new logic.
-- (This prevents breaking legacy queries until full transition).
