-- Normalize item_taxes condition fields:
-- - move any single condition_value into condition_values (1-element array)
-- - drop legacy condition_value column

BEGIN;

-- If condition_value is set but condition_values is empty/null, convert to a 1-element array.
UPDATE item_taxes
SET condition_values = jsonb_build_array(condition_value)
WHERE condition_value IS NOT NULL
  AND (condition_values IS NULL OR condition_values = '[]'::jsonb);

-- Drop indexes that depend on condition_value.
DROP INDEX IF EXISTS idx_item_taxes_condition;
DROP INDEX IF EXISTS idx_item_taxes_item_condition_unique;

-- Drop legacy column.
ALTER TABLE item_taxes
  DROP COLUMN IF EXISTS condition_value;

-- Recreate indexes for the new shape.
CREATE INDEX IF NOT EXISTS idx_item_taxes_condition_type ON item_taxes(condition_type);
CREATE INDEX IF NOT EXISTS idx_item_taxes_condition_values_gin ON item_taxes USING GIN (condition_values);

-- Ensure uniqueness per (item, condition_type, variable, condition_values).
-- condition_values is JSONB; use its text representation for a stable unique key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_taxes_item_condition_values_unique
  ON item_taxes (item_id, condition_type, variable_id, COALESCE(condition_values::text, '[]'));

COMMIT;
