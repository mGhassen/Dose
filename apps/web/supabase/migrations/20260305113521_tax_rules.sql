-- Tax rules: when to apply which tax (variable) and to what scope.
-- Replaces name-based lookup (transaction_tax name = sales_type or expense_category).

CREATE TABLE IF NOT EXISTS tax_rules (
  id BIGSERIAL PRIMARY KEY,
  variable_id BIGINT NOT NULL REFERENCES variables(id) ON DELETE CASCADE,
  condition_type VARCHAR(50) NULL,
  condition_value VARCHAR(100) NULL,
  scope_type VARCHAR(50) NOT NULL DEFAULT 'all',
  scope_item_ids JSONB NULL,
  scope_categories JSONB NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  effective_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_rules_variable_id ON tax_rules(variable_id);
CREATE INDEX IF NOT EXISTS idx_tax_rules_condition ON tax_rules(condition_type, condition_value);
CREATE INDEX IF NOT EXISTS idx_tax_rules_priority ON tax_rules(priority);

CREATE TRIGGER update_tax_rules_updated_at BEFORE UPDATE ON tax_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default expense tax variable: moved to seed.sql.

-- Subscription default tax: applied when subscription generates expense lines (e.g. payment marked paid).
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS default_tax_rate_percent DECIMAL(5,2) NULL;

