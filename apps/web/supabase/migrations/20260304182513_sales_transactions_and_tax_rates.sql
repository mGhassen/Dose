-- Square-style transactions: tax rates by dining option, line items per sale

-- Sales tax rates (per dining option / sales_type)
CREATE TABLE IF NOT EXISTS sales_tax_rates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rate_percent DECIMAL(5,2) NOT NULL,
  sales_type VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_tax_rates_sales_type ON sales_tax_rates(sales_type);
CREATE INDEX IF NOT EXISTS idx_sales_tax_rates_effective ON sales_tax_rates(effective_date, end_date);

CREATE TRIGGER update_sales_tax_rates_updated_at BEFORE UPDATE ON sales_tax_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sale line items (multiple items per transaction)
CREATE TABLE IF NOT EXISTS sale_line_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_sale_line_items_sale_id ON sale_line_items(sale_id);

CREATE TRIGGER update_sale_line_items_updated_at BEFORE UPDATE ON sale_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Transaction totals on sales (nullable for legacy rows)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,4) NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_tax DECIMAL(15,4) NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_discount DECIMAL(15,4) NULL;

-- Backfill existing sales: subtotal = amount, no tax/discount
UPDATE sales
SET subtotal = amount,
    total_tax = COALESCE(total_tax, 0),
    total_discount = COALESCE(total_discount, 0)
WHERE subtotal IS NULL;

-- Default tax rates per sales type (effective from 2024-01-01)
INSERT INTO sales_tax_rates (name, rate_percent, sales_type, effective_date)
VALUES
  ('On site', 10.00, 'on_site', '2024-01-01'),
  ('Delivery', 10.00, 'delivery', '2024-01-01'),
  ('Takeaway', 5.50, 'takeaway', '2024-01-01'),
  ('Catering', 10.00, 'catering', '2024-01-01'),
  ('Other', 0.00, 'other', '2024-01-01');
