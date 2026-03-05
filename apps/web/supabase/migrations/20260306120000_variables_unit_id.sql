-- Add unit_id to variables: non-unit variables (tax, cost, etc.) can reference a unit variable for their unit.
ALTER TABLE variables
  ADD COLUMN IF NOT EXISTS unit_id BIGINT NULL;

ALTER TABLE variables
  ADD CONSTRAINT variables_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES variables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_variables_unit_id ON variables(unit_id);
