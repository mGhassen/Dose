-- Move transaction tax into variables; drop sales_tax_rates.
-- Convention: variables with type = 'transaction_tax', name = scope (sales_type or expense_category), value = rate percent.

INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active)
SELECT sales_type, 'transaction_tax', rate_percent, 'percentage', effective_date, end_date, 'Sales: ' || name, true
FROM sales_tax_rates;

INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active)
VALUES
  ('rent', 'transaction_tax', 0, 'percentage', '2024-01-01', NULL, 'Expense: Rent', true),
  ('utilities', 'transaction_tax', 10, 'percentage', '2024-01-01', NULL, 'Expense: Utilities', true),
  ('supplies', 'transaction_tax', 10, 'percentage', '2024-01-01', NULL, 'Expense: Supplies', true),
  ('marketing', 'transaction_tax', 10, 'percentage', '2024-01-01', NULL, 'Expense: Marketing', true),
  ('insurance', 'transaction_tax', 0, 'percentage', '2024-01-01', NULL, 'Expense: Insurance', true),
  ('maintenance', 'transaction_tax', 10, 'percentage', '2024-01-01', NULL, 'Expense: Maintenance', true),
  ('professional_services', 'transaction_tax', 10, 'percentage', '2024-01-01', NULL, 'Expense: Professional services', true),
  ('other', 'transaction_tax', 0, 'percentage', '2024-01-01', NULL, 'Expense: Other', true);

DROP TABLE IF EXISTS sales_tax_rates;
