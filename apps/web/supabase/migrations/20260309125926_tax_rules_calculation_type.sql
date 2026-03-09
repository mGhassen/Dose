-- Tax calculation mode per rule: additive (tax on top) or inclusive (tax in price).
-- When NULL, resolution falls back to the variable's payload.calculationType.
ALTER TABLE tax_rules
  ADD COLUMN IF NOT EXISTS calculation_type VARCHAR(20) NULL
  CHECK (calculation_type IS NULL OR calculation_type IN ('additive', 'inclusive'));
