-- Item Categories: first-class category entity for items, replacing
-- the text column `items.category` and the `ItemCategory` metadata enum.

CREATE TABLE item_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_item_categories_name_lower ON item_categories (LOWER(name));
CREATE INDEX idx_item_categories_is_active ON item_categories(is_active);
CREATE INDEX idx_item_categories_display_order ON item_categories(display_order);

ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read item_categories"
  ON item_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert item_categories"
  ON item_categories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update item_categories"
  ON item_categories FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete item_categories"
  ON item_categories FOR DELETE
  USING (auth.role() = 'authenticated');

-- Link column on items
ALTER TABLE items ADD COLUMN category_id BIGINT REFERENCES item_categories(id) ON DELETE SET NULL;
CREATE INDEX idx_items_category_id ON items(category_id);

-- Backfill 1: migrate ItemCategory metadata_enum values into item_categories
INSERT INTO item_categories (name, label, description, display_order, is_active)
SELECT v.name, v.label, v.description, COALESCE(v.display_order, 0), COALESCE(v.is_active, true)
FROM metadata_enum_values v
JOIN metadata_enums e ON e.id = v.enum_id
WHERE e.name = 'ItemCategory'
ON CONFLICT DO NOTHING;

-- Backfill 2: add any distinct non-null items.category values not already present
INSERT INTO item_categories (name, label, is_active)
SELECT DISTINCT LOWER(TRIM(i.category)) AS name,
       TRIM(i.category) AS label,
       true
FROM items i
WHERE i.category IS NOT NULL
  AND TRIM(i.category) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM item_categories c WHERE LOWER(c.name) = LOWER(TRIM(i.category))
  );

-- Link items to the new category rows (match by case-insensitive name)
UPDATE items
SET category_id = ic.id
FROM item_categories ic
WHERE items.category IS NOT NULL
  AND TRIM(items.category) <> ''
  AND LOWER(ic.name) = LOWER(TRIM(items.category));

-- Drop old text column and its index
DROP INDEX IF EXISTS idx_items_category;
ALTER TABLE items DROP COLUMN category;

-- Remove the ItemCategory metadata enum (values cascade via FK)
DELETE FROM metadata_enums WHERE name = 'ItemCategory';
