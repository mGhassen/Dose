-- Migrate legacy sales (old single-item) → new transaction model (one line item per sale)
-- For each sale that has no line items, create one sale_line_item from the sale row.
INSERT INTO sale_line_items (sale_id, item_id, quantity, unit_id, unit_price, unit_cost, tax_rate_percent, tax_amount, line_total, sort_order)
SELECT
  s.id,
  s.item_id,
  COALESCE(s.quantity, 1),
  s.unit_id,
  COALESCE(s.unit_price, s.amount),
  s.unit_cost,
  0,
  0,
  s.amount,
  0
FROM sales s
WHERE NOT EXISTS (SELECT 1 FROM sale_line_items sli WHERE sli.sale_id = s.id);
