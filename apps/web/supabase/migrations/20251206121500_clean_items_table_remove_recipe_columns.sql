-- Clean up items table: Remove recipe-specific columns
-- Recipes should only exist in the recipes table, not in items table
-- Items table should only contain regular inventory items

-- Drop index before column so we don't try to drop an index already removed with the column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_items_recipe_id') THEN
    DROP INDEX idx_items_recipe_id;
  END IF;
END $$;

ALTER TABLE items DROP COLUMN IF EXISTS serving_size;
ALTER TABLE items DROP COLUMN IF EXISTS preparation_time;
ALTER TABLE items DROP COLUMN IF EXISTS cooking_time;
ALTER TABLE items DROP COLUMN IF EXISTS instructions;
ALTER TABLE items DROP COLUMN IF EXISTS recipe_id;

-- Ensure item_type defaults to 'item' for existing records
UPDATE items SET item_type = 'item' WHERE item_type IS NULL OR item_type = 'recipe';

-- Remove any items that might have been incorrectly created as recipes
-- (These should be in recipes table instead)
DELETE FROM items WHERE item_type = 'recipe';




