-- Add recipe_id to items table to link items to recipes
-- This migration runs after items table is created

ALTER TABLE items ADD COLUMN recipe_id BIGINT REFERENCES recipes(id) ON DELETE SET NULL;
CREATE INDEX idx_items_recipe_id ON items(recipe_id);

