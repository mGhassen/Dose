-- Item-level tax assignments: one row = one tax (variable) applied to one item under one condition.
-- Tax rules can be materialized into item_taxes; consumers resolve tax from item_taxes first, then fallback to tax_rules.

CREATE TABLE IF NOT EXISTS item_taxes (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variable_id BIGINT NOT NULL REFERENCES variables(id) ON DELETE CASCADE,
  condition_type VARCHAR(50) NOT NULL,
  condition_value VARCHAR(100) NULL,
  condition_values JSONB NULL,
  calculation_type VARCHAR(20) NULL CHECK (calculation_type IS NULL OR calculation_type IN ('additive', 'inclusive')),
  priority INTEGER NOT NULL DEFAULT 0,
  effective_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_taxes_item_id ON item_taxes(item_id);
CREATE INDEX IF NOT EXISTS idx_item_taxes_variable_id ON item_taxes(variable_id);
CREATE INDEX IF NOT EXISTS idx_item_taxes_condition ON item_taxes(condition_type, condition_value);
CREATE UNIQUE INDEX idx_item_taxes_item_condition_unique ON item_taxes (item_id, condition_type, COALESCE(condition_value, ''));

CREATE TRIGGER update_item_taxes_updated_at BEFORE UPDATE ON item_taxes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
