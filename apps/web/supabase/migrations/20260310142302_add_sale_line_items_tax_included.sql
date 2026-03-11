-- sale_line_items.tax_included: true = price includes tax, false = tax on top, null = unknown
ALTER TABLE sale_line_items
  ADD COLUMN IF NOT EXISTS tax_included BOOLEAN NULL;

COMMENT ON COLUMN sale_line_items.tax_included IS 'True = price includes tax, false = tax on top, null = unknown';
