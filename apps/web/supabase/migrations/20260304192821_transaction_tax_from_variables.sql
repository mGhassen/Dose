-- Move transaction tax into variables; drop sales_tax_rates.
-- Convention: variables with type = 'transaction_tax', name = scope (sales_type or expense_category), value = rate percent.

INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active)
SELECT sales_type, 'transaction_tax', rate_percent, 'percentage', effective_date, end_date, 'Sales: ' || name, true
FROM sales_tax_rates;

DROP TABLE IF EXISTS sales_tax_rates;
