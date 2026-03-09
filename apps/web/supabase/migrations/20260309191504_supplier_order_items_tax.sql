-- Tax on supplier order lines: rate and amount (unit price remains excl. tax)
ALTER TABLE supplier_order_items
  ADD COLUMN IF NOT EXISTS tax_rate_percent DECIMAL(5,2) NULL,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,4) NULL;

COMMENT ON COLUMN supplier_order_items.tax_rate_percent IS 'VAT/tax rate as percentage; null or 0 = no tax';
COMMENT ON COLUMN supplier_order_items.tax_amount IS 'Tax amount for this line (total_price is net)';
