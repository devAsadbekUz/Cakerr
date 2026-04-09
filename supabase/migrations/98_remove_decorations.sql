-- Remove decoration, sponge, and cream options as per the new 4-step wizard structure
DELETE FROM custom_cake_options 
WHERE type IN ('decoration', 'sponge', 'cream');
