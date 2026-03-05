-- Multiple produced items per recipe: junction table
CREATE TABLE IF NOT EXISTS recipe_produced_items (
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, item_id),
  UNIQUE (recipe_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_produced_items_recipe_id ON recipe_produced_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_produced_items_item_id ON recipe_produced_items(item_id);

-- Backfill from recipes.produced_item_id
INSERT INTO recipe_produced_items (recipe_id, item_id)
SELECT id, produced_item_id
FROM recipes
WHERE produced_item_id IS NOT NULL
ON CONFLICT (recipe_id, item_id) DO NOTHING;
