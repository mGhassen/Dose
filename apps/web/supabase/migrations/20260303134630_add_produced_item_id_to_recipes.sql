-- Optional link from recipe to the item it produces (otherwise item is created on first produce)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS produced_item_id BIGINT REFERENCES items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_recipes_produced_item_id ON recipes(produced_item_id);
