-- Variables: add payload JSONB, make effective_date/end_date nullable.
-- Migrate units into variables (type=unit), repoint unit_id FKs to variables(id), drop units table.

ALTER TABLE variables ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE variables ALTER COLUMN effective_date DROP NOT NULL;
ALTER TABLE variables ALTER COLUMN end_date DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variables_payload ON variables USING GIN (payload);

CREATE TEMP TABLE IF NOT EXISTS _unit_id_map (old_id BIGINT PRIMARY KEY, new_id BIGINT);

DO $$
DECLARE
  r RECORD;
  new_id BIGINT;
  base_var_id BIGINT;
BEGIN
  FOR r IN
    SELECT u.id, u.name, u.symbol, u.dimension, u.base_unit_id, u.factor_to_base
    FROM units u
    ORDER BY (u.base_unit_id IS NULL) DESC, u.id
  LOOP
    base_var_id := NULL;
    IF r.base_unit_id IS NOT NULL THEN
      SELECT m.new_id INTO base_var_id FROM _unit_id_map m WHERE m.old_id = r.base_unit_id;
    END IF;

    INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
    VALUES (
      r.name,
      'unit',
      r.factor_to_base,
      NULL,
      NULL,
      NULL,
      NULL,
      true,
      jsonb_build_object('symbol', r.symbol, 'dimension', r.dimension, 'base_unit_id', base_var_id)
    )
    RETURNING id INTO new_id;

    INSERT INTO _unit_id_map (old_id, new_id) VALUES (r.id, new_id) ON CONFLICT (old_id) DO UPDATE SET new_id = EXCLUDED.new_id;
  END LOOP;
END $$;

UPDATE items SET unit_id = m.new_id FROM _unit_id_map m WHERE items.unit_id = m.old_id;
UPDATE recipes SET unit_id = m.new_id FROM _unit_id_map m WHERE recipes.unit_id = m.old_id;
UPDATE stock_levels SET unit_id = m.new_id FROM _unit_id_map m WHERE stock_levels.unit_id = m.old_id;
UPDATE stock_movements SET unit_id = m.new_id FROM _unit_id_map m WHERE stock_movements.unit_id = m.old_id;
UPDATE supplier_order_items SET unit_id = m.new_id FROM _unit_id_map m WHERE supplier_order_items.unit_id = m.old_id;
UPDATE sales SET unit_id = m.new_id FROM _unit_id_map m WHERE sales.unit_id = m.old_id;
UPDATE expiry_dates SET unit_id = m.new_id FROM _unit_id_map m WHERE expiry_dates.unit_id = m.old_id;
UPDATE sale_line_items SET unit_id = m.new_id FROM _unit_id_map m WHERE sale_line_items.unit_id = m.old_id;
UPDATE expense_line_items SET unit_id = m.new_id FROM _unit_id_map m WHERE expense_line_items.unit_id = m.old_id;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'recipe_items' AND column_name = 'unit_id') THEN
    UPDATE recipe_items SET unit_id = m.new_id FROM _unit_id_map m WHERE recipe_items.unit_id = m.old_id;
  END IF;
END $$;

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_unit_id_fkey;
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_unit_id_fkey;
ALTER TABLE stock_levels DROP CONSTRAINT IF EXISTS stock_levels_unit_id_fkey;
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_unit_id_fkey;
ALTER TABLE supplier_order_items DROP CONSTRAINT IF EXISTS supplier_order_items_unit_id_fkey;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_unit_id_fkey;
ALTER TABLE expiry_dates DROP CONSTRAINT IF EXISTS expiry_dates_unit_id_fkey;
ALTER TABLE sale_line_items DROP CONSTRAINT IF EXISTS sale_line_items_unit_id_fkey;
ALTER TABLE expense_line_items DROP CONSTRAINT IF EXISTS expense_line_items_unit_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'recipe_items' AND column_name = 'unit_id') THEN
    ALTER TABLE recipe_items DROP CONSTRAINT IF EXISTS recipe_items_unit_id_fkey;
  END IF;
END $$;

ALTER TABLE items ADD CONSTRAINT items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
ALTER TABLE recipes ADD CONSTRAINT recipes_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
ALTER TABLE stock_levels ADD CONSTRAINT stock_levels_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
ALTER TABLE supplier_order_items ADD CONSTRAINT supplier_order_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
ALTER TABLE sales ADD CONSTRAINT sales_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
ALTER TABLE expiry_dates ADD CONSTRAINT expiry_dates_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
ALTER TABLE sale_line_items ADD CONSTRAINT sale_line_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
ALTER TABLE expense_line_items ADD CONSTRAINT expense_line_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'recipe_items' AND column_name = 'unit_id') THEN
    ALTER TABLE recipe_items ADD CONSTRAINT recipe_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP TABLE units;
