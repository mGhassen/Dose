-- Store Expense Projection Entries
-- Instead of calculating on the fly, store all expense projection entries

CREATE TABLE IF NOT EXISTS expense_projection_entries (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  amount DECIMAL(15,2) NOT NULL,
  is_projected BOOLEAN DEFAULT true,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  actual_amount DECIMAL(15,2), -- If different from projected amount
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(expense_id, month)
);

CREATE INDEX idx_expense_projection_expense_id ON expense_projection_entries(expense_id);
CREATE INDEX idx_expense_projection_month ON expense_projection_entries(month);
CREATE INDEX idx_expense_projection_is_projected ON expense_projection_entries(is_projected);
CREATE INDEX idx_expense_projection_is_paid ON expense_projection_entries(is_paid);

CREATE TRIGGER update_expense_projection_entries_updated_at BEFORE UPDATE ON expense_projection_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

