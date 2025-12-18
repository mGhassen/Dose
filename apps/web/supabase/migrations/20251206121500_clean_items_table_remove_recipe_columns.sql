-- Clean up items table: Remove recipe-specific columns
-- Recipes should only exist in the recipes table, not in items table
-- Items table should only contain regular inventory items

-- Remove recipe-specific columns from items table
ALTER TABLE items DROP COLUMN IF EXISTS serving_size;
ALTER TABLE items DROP COLUMN IF EXISTS preparation_time;
ALTER TABLE items DROP COLUMN IF EXISTS cooking_time;
ALTER TABLE items DROP COLUMN IF EXISTS instructions;

-- Remove recipe_id column (recipes are not items, they're separate)
ALTER TABLE items DROP COLUMN IF EXISTS recipe_id;

-- Remove the index if it exists
DROP INDEX IF EXISTS idx_items_recipe_id;

-- Ensure item_type defaults to 'item' for existing records
UPDATE items SET item_type = 'item' WHERE item_type IS NULL OR item_type = 'recipe';

-- Remove any items that might have been incorrectly created as recipes
-- (These should be in recipes table instead)
DELETE FROM items WHERE item_type = 'recipe';



