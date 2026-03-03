-- Units table: managed units with conversion relations (e.g. 1 kg = 1000 g)
CREATE TABLE units (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  dimension VARCHAR(20) NOT NULL DEFAULT 'other',
  base_unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL,
  factor_to_base DECIMAL(20,8) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_units_symbol ON units(symbol);
CREATE INDEX idx_units_dimension ON units(dimension);
CREATE INDEX idx_units_base_unit_id ON units(base_unit_id);

-- Seed common units (base units first: g, L, unit/serving)
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base) VALUES
  ('Gram', 'g', 'mass', NULL, 1),
  ('Liter', 'L', 'volume', NULL, 1),
  ('Unit', 'unit', 'count', NULL, 1),
  ('Serving', 'serving', 'count', NULL, 1);

-- Derived units (reference base by symbol for id)
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Kilogram', 'kg', 'mass', u.id, 1000 FROM units u WHERE u.symbol = 'g' LIMIT 1;
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Milligram', 'mg', 'mass', u.id, 0.001 FROM units u WHERE u.symbol = 'g' LIMIT 1;
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Milliliter', 'mL', 'volume', u.id, 0.001 FROM units u WHERE u.symbol = 'L' LIMIT 1;
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Piece', 'piece', 'count', u.id, 1 FROM units u WHERE u.symbol = 'unit' LIMIT 1;
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Box', 'box', 'count', u.id, 1 FROM units u WHERE u.symbol = 'unit' LIMIT 1;
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Can', 'can', 'count', u.id, 1 FROM units u WHERE u.symbol = 'unit' LIMIT 1;
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Bottle', 'bottle', 'count', u.id, 1 FROM units u WHERE u.symbol = 'unit' LIMIT 1;
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Pack', 'pack', 'count', u.id, 1 FROM units u WHERE u.symbol = 'unit' LIMIT 1;
INSERT INTO units (name, symbol, dimension, base_unit_id, factor_to_base)
SELECT 'Bag', 'bag', 'count', u.id, 1 FROM units u WHERE u.symbol = 'unit' LIMIT 1;

-- Add unit_id to all tables that have unit
ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE stock_levels ADD COLUMN IF NOT EXISTS unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE supplier_order_items ADD COLUMN IF NOT EXISTS unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE expiry_dates ADD COLUMN IF NOT EXISTS unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_items') THEN
    ALTER TABLE recipe_items ADD COLUMN IF NOT EXISTS unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill unit_id from existing unit (VARCHAR): match by symbol (case-insensitive) or create unit and set
DO $$
DECLARE
  r RECORD;
  u_id BIGINT;
  sym TEXT;
BEGIN
  FOR r IN (SELECT DISTINCT TRIM(unit) AS u FROM items WHERE unit IS NOT NULL AND unit != '')
  LOOP
    sym := r.u;
    SELECT id INTO u_id FROM units WHERE LOWER(symbol) = LOWER(sym) LIMIT 1;
    IF u_id IS NULL THEN
      INSERT INTO units (name, symbol, dimension, factor_to_base) VALUES (sym, sym, 'other', 1) RETURNING id INTO u_id;
    END IF;
    UPDATE items SET unit_id = u_id WHERE TRIM(unit) = r.u;
  END LOOP;

  FOR r IN (SELECT DISTINCT TRIM(unit) AS u FROM recipes WHERE unit IS NOT NULL AND unit != '')
  LOOP
    sym := r.u;
    SELECT id INTO u_id FROM units WHERE LOWER(symbol) = LOWER(sym) LIMIT 1;
    IF u_id IS NULL THEN
      INSERT INTO units (name, symbol, dimension, factor_to_base) VALUES (sym, sym, 'other', 1) RETURNING id INTO u_id;
    END IF;
    UPDATE recipes SET unit_id = u_id WHERE TRIM(unit) = r.u;
  END LOOP;

  FOR r IN (SELECT DISTINCT TRIM(unit) AS u FROM stock_levels WHERE unit IS NOT NULL AND unit != '')
  LOOP
    sym := r.u;
    SELECT id INTO u_id FROM units WHERE LOWER(symbol) = LOWER(sym) LIMIT 1;
    IF u_id IS NULL THEN
      INSERT INTO units (name, symbol, dimension, factor_to_base) VALUES (sym, sym, 'other', 1) RETURNING id INTO u_id;
    END IF;
    UPDATE stock_levels SET unit_id = u_id WHERE TRIM(unit) = r.u;
  END LOOP;

  FOR r IN (SELECT DISTINCT TRIM(unit) AS u FROM stock_movements WHERE unit IS NOT NULL AND unit != '')
  LOOP
    sym := r.u;
    SELECT id INTO u_id FROM units WHERE LOWER(symbol) = LOWER(sym) LIMIT 1;
    IF u_id IS NULL THEN
      INSERT INTO units (name, symbol, dimension, factor_to_base) VALUES (sym, sym, 'other', 1) RETURNING id INTO u_id;
    END IF;
    UPDATE stock_movements SET unit_id = u_id WHERE TRIM(unit) = r.u;
  END LOOP;

  FOR r IN (SELECT DISTINCT TRIM(unit) AS u FROM supplier_order_items WHERE unit IS NOT NULL AND unit != '')
  LOOP
    sym := r.u;
    SELECT id INTO u_id FROM units WHERE LOWER(symbol) = LOWER(sym) LIMIT 1;
    IF u_id IS NULL THEN
      INSERT INTO units (name, symbol, dimension, factor_to_base) VALUES (sym, sym, 'other', 1) RETURNING id INTO u_id;
    END IF;
    UPDATE supplier_order_items SET unit_id = u_id WHERE TRIM(unit) = r.u;
  END LOOP;

  FOR r IN (SELECT DISTINCT TRIM(unit) AS u FROM sales WHERE unit IS NOT NULL AND unit != '')
  LOOP
    sym := r.u;
    SELECT id INTO u_id FROM units WHERE LOWER(symbol) = LOWER(sym) LIMIT 1;
    IF u_id IS NULL THEN
      INSERT INTO units (name, symbol, dimension, factor_to_base) VALUES (sym, sym, 'other', 1) RETURNING id INTO u_id;
    END IF;
    UPDATE sales SET unit_id = u_id WHERE TRIM(unit) = r.u;
  END LOOP;

  FOR r IN (SELECT DISTINCT TRIM(unit) AS u FROM expiry_dates WHERE unit IS NOT NULL AND unit != '')
  LOOP
    sym := r.u;
    SELECT id INTO u_id FROM units WHERE LOWER(symbol) = LOWER(sym) LIMIT 1;
    IF u_id IS NULL THEN
      INSERT INTO units (name, symbol, dimension, factor_to_base) VALUES (sym, sym, 'other', 1) RETURNING id INTO u_id;
    END IF;
    UPDATE expiry_dates SET unit_id = u_id WHERE TRIM(unit) = r.u;
  END LOOP;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_items') THEN
    FOR r IN (SELECT DISTINCT TRIM(unit) AS u FROM recipe_items WHERE unit IS NOT NULL AND unit != '')
    LOOP
      sym := r.u;
      SELECT id INTO u_id FROM units WHERE LOWER(symbol) = LOWER(sym) LIMIT 1;
      IF u_id IS NULL THEN
        INSERT INTO units (name, symbol, dimension, factor_to_base) VALUES (sym, sym, 'other', 1) RETURNING id INTO u_id;
      END IF;
      UPDATE recipe_items SET unit_id = u_id WHERE TRIM(unit) = r.u;
    END LOOP;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_unit_id ON items(unit_id);
CREATE INDEX IF NOT EXISTS idx_recipes_unit_id ON recipes(unit_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_unit_id ON stock_levels(unit_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_unit_id ON stock_movements(unit_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_items_unit_id ON supplier_order_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_sales_unit_id ON sales(unit_id);
CREATE INDEX IF NOT EXISTS idx_expiry_dates_unit_id ON expiry_dates(unit_id);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_items') AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'recipe_items' AND column_name = 'unit_id') THEN
    CREATE INDEX IF NOT EXISTS idx_recipe_items_unit_id ON recipe_items(unit_id);
  END IF;
END $$;
