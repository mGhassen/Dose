-- Add produced_from_recipe_id to items table
-- This links items that were produced from recipes

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS produced_from_recipe_id BIGINT REFERENCES recipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_produced_from_recipe_id ON items(produced_from_recipe_id);

