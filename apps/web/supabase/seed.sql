-- Staging seed: config only, no business data.
-- Run with: supabase db reset (applies migrations then this file).
-- For full coffee-shop dataset, run seed-full.sql manually after reset.

-- ============================================================================
-- VARIABLES
-- ============================================================================
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active) VALUES
('VAT Rate', 'tax', 20.0, 'percentage', '2024-01-01', NULL, 'Value Added Tax rate', true),
('Corporate Tax Rate', 'tax', 25.0, 'percentage', '2024-01-01', NULL, 'Corporate income tax rate', true),
('Inflation Rate', 'inflation', 8.5, 'percentage', '2024-01-01', NULL, 'Annual inflation rate', true),
('EUR to TND Exchange Rate', 'exchange_rate', 3.25, 'rate', '2024-01-01', NULL, 'Euro to Tunisian Dinar exchange rate', true),
('Minimum Wage', 'cost', 450.0, 'TND', '2024-01-01', NULL, 'Minimum monthly wage', true),
('Social Security Rate', 'tax', 18.75, 'percentage', '2024-01-01', NULL, 'Employer social security contribution rate', true),
('Employee Social Tax Rate', 'tax', 20.0, 'percentage', '2024-01-01', NULL, 'Employee social tax deduction rate (applied to brute salary to calculate net)', true),
('TVA', 'transaction_tax', 20.0, 'percentage', '2025-01-12', NULL, 'TVA 20%', true),
('TVA', 'transaction_tax', 5.5, 'percentage', '2025-01-12', NULL, 'TVA 5.5%', true),
('TVA', 'transaction_tax', 10.0, 'percentage', '2025-01-12', NULL, 'TVA 10%', true);

SELECT setval('variables_id_seq', (SELECT MAX(id) FROM variables));

-- ============================================================================
-- TAX RULES (TVA by dining option and expense)
-- ============================================================================
INSERT INTO tax_rules (variable_id, condition_type, condition_value, condition_values, scope_type, rule_type, priority)
SELECT v.id, 'sales_type', 'on_site', '["on_site"]'::jsonb, 'all', 'taxable', 0
FROM variables v WHERE v.name = 'TVA' AND v.type = 'transaction_tax' AND v.value = 10.0
UNION ALL
SELECT v.id, 'sales_type', NULL, '["delivery","takeaway","catering","other"]'::jsonb, 'all', 'taxable', 0
FROM variables v WHERE v.name = 'TVA' AND v.type = 'transaction_tax' AND v.value = 5.5
UNION ALL
SELECT v.id, 'expense', NULL, NULL, 'all', 'taxable', 0
FROM variables v WHERE v.name = 'TVA' AND v.type = 'transaction_tax' AND v.value = 20.0;
