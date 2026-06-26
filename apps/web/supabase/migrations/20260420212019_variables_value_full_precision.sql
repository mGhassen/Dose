-- variables.value was DECIMAL(15,2), which rounded e.g. 0.0001 to 0.
-- Unbounded NUMERIC preserves full precision for unit factors and other values.
ALTER TABLE variables
  ALTER COLUMN value TYPE NUMERIC
  USING value::numeric;
