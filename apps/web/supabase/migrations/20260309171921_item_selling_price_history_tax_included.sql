-- Selling price history: store whether the price is tax-included or tax-excluded
ALTER TABLE item_selling_price_history
  ADD COLUMN IF NOT EXISTS tax_included BOOLEAN NULL;

COMMENT ON COLUMN item_selling_price_history.tax_included IS 'True = price is including tax, false = excluding tax, null = legacy unknown';

ALTER TABLE item_cost_history ADD COLUMN IF NOT EXISTS tax_included BOOLEAN NULL;
