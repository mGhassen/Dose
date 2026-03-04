-- Expenses as transactions: line items, subtotal, tax, discount (mirror of sales model)
-- Transaction tax for expenses comes from variables (type = 'transaction_tax', name = expense category).

CREATE TABLE IF NOT EXISTS expense_line_items (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  item_id BIGINT REFERENCES items(id) ON DELETE SET NULL,
  quantity DECIMAL(15,4) NOT NULL,
  unit_id BIGINT REFERENCES units(id) ON DELETE SET NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  unit_cost DECIMAL(15,4),
  tax_rate_percent DECIMAL(5,2),
  tax_amount DECIMAL(15,4),
  line_total DECIMAL(15,4) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_line_items_expense_id ON expense_line_items(expense_id);

CREATE TRIGGER update_expense_line_items_updated_at BEFORE UPDATE ON expense_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,4) NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS total_tax DECIMAL(15,4) NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS total_discount DECIMAL(15,4) NULL;

UPDATE expenses
SET subtotal = amount,
    total_tax = COALESCE(total_tax, 0),
    total_discount = COALESCE(total_discount, 0)
WHERE subtotal IS NULL;

INSERT INTO expense_line_items (expense_id, item_id, quantity, unit_id, unit_price, unit_cost, tax_rate_percent, tax_amount, line_total, sort_order)
SELECT
  e.id,
  NULL,
  1,
  NULL,
  e.amount,
  NULL,
  0,
  0,
  e.amount,
  0
FROM expenses e
WHERE NOT EXISTS (SELECT 1 FROM expense_line_items eli WHERE eli.expense_id = e.id);
