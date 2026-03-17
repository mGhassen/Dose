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


-- ============================================================================
-- TAX RULES (TVA by dining option and expense)
-- ============================================================================
INSERT INTO tax_rules (variable_id, condition_type, condition_value, condition_values, scope_type, rule_type, priority, calculation_type)
SELECT v.id, 'sales_type', 'on_site', '["on_site"]'::jsonb, 'all', 'taxable', 0, 'inclusive'
FROM variables v WHERE v.name = 'TVA' AND v.type = 'transaction_tax' AND v.value = 10.0
UNION ALL
SELECT v.id, 'sales_type', NULL, '["delivery","takeaway","catering","other"]'::jsonb, 'all', 'taxable', 0, 'inclusive'
FROM variables v WHERE v.name = 'TVA' AND v.type = 'transaction_tax' AND v.value = 5.5
UNION ALL
SELECT v.id, 'expense', NULL, NULL, 'all', 'taxable', 0, 'inclusive'
FROM variables v WHERE v.name = 'TVA' AND v.type = 'transaction_tax' AND v.value = 20.0;

-- ============================================================================
-- UNITS as variables (type=unit); units table is dropped in 20260305144538
-- ============================================================================
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Gram', 'unit', 1, NULL, NULL, NULL, NULL, true, '{"symbol":"g","dimension":"mass","base_unit_id":null}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'g');
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Liter', 'unit', 1, NULL, NULL, NULL, NULL, true, '{"symbol":"L","dimension":"volume","base_unit_id":null}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'L');
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Unit', 'unit', 1, NULL, NULL, NULL, NULL, true, '{"symbol":"unit","dimension":"count","base_unit_id":null}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'unit');
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Serving', 'unit', 1, NULL, NULL, NULL, NULL, true, '{"symbol":"serving","dimension":"count","base_unit_id":null}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'serving');

INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Kilogram', 'unit', 1000, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','kg','dimension','mass','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'g'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'kg')
LIMIT 1;
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Milligram', 'unit', 0.001, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','mg','dimension','mass','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'g'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'mg')
LIMIT 1;
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Milliliter', 'unit', 0.001, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','mL','dimension','volume','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'L'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'mL')
LIMIT 1;
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Piece', 'unit', 1, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','piece','dimension','count','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'unit'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'piece')
LIMIT 1;
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Box', 'unit', 1, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','box','dimension','count','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'unit'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'box')
LIMIT 1;
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Can', 'unit', 1, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','can','dimension','count','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'unit'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'can')
LIMIT 1;
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Bottle', 'unit', 1, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','bottle','dimension','count','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'unit'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'bottle')
LIMIT 1;
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Pack', 'unit', 1, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','pack','dimension','count','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'unit'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'pack')
LIMIT 1;
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active, payload)
SELECT 'Bag', 'unit', 1, NULL, NULL, NULL, NULL, true,
  jsonb_build_object('symbol','bag','dimension','count','base_unit_id', v.id)
FROM variables v
WHERE v.type = 'unit' AND v.payload->>'symbol' = 'unit'
  AND NOT EXISTS (SELECT 1 FROM variables WHERE type = 'unit' AND payload->>'symbol' = 'bag')
LIMIT 1;

-- ============================================================================
-- METADATA ENUMS (from 20251201225718_seed_metadata_enums)
-- ============================================================================
INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('ExpenseCategory', 'Expense Category', 'Categories for classifying expenses', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('rent', 'Rent', 'Rental expenses for premises', 1),
  ('utilities', 'Utilities', 'Electricity, water, gas, and other utilities', 2),
  ('supplies', 'Supplies', 'Office and operational supplies', 3),
  ('marketing', 'Marketing', 'Marketing and advertising expenses', 4),
  ('insurance', 'Insurance', 'Insurance premiums and coverage', 5),
  ('maintenance', 'Maintenance', 'Equipment and facility maintenance', 6),
  ('professional_services', 'Professional Services', 'Legal, accounting, and consulting services', 7),
  ('other', 'Other', 'Other miscellaneous expenses', 8)
) AS v(name, label, description, display_order)
WHERE e.name = 'ExpenseCategory'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('ExpenseRecurrence', 'Expense Recurrence', 'Frequency patterns for recurring expenses', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('one_time', 'One Time', 'Single occurrence expense', 1),
  ('monthly', 'Monthly', 'Recurring monthly expense', 2),
  ('quarterly', 'Quarterly', 'Recurring quarterly expense', 3),
  ('yearly', 'Yearly', 'Recurring yearly expense', 4),
  ('custom', 'Custom', 'Custom recurrence pattern', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'ExpenseRecurrence'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('SalesType', 'Sales Type', 'Types of sales channels', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('on_site', 'On Site', 'Sales made on premises (CA sur place)', 1),
  ('delivery', 'Delivery', 'Delivery sales (Livraison)', 2),
  ('takeaway', 'Takeaway', 'Takeaway sales (À emporter)', 3),
  ('catering', 'Catering', 'Catering services (Traiteur)', 4),
  ('other', 'Other', 'Other sales types', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'SalesType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('LoanStatus', 'Loan Status', 'Status of loan accounts', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('active', 'Active', 'Loan is currently active', 1),
  ('paid_off', 'Paid Off', 'Loan has been fully paid', 2),
  ('defaulted', 'Defaulted', 'Loan is in default', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'LoanStatus'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('InvestmentType', 'Investment Type', 'Types of investments', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('equipment', 'Equipment', 'Equipment purchases', 1),
  ('renovation', 'Renovation', 'Renovation and improvement projects', 2),
  ('technology', 'Technology', 'Technology and software investments', 3),
  ('vehicle', 'Vehicle', 'Vehicle purchases', 4),
  ('other', 'Other', 'Other types of investments', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'InvestmentType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('DepreciationMethod', 'Depreciation Method', 'Methods for calculating depreciation', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('straight_line', 'Straight Line', 'Straight-line depreciation method', 1),
  ('declining_balance', 'Declining Balance', 'Declining balance depreciation method', 2),
  ('units_of_production', 'Units of Production', 'Units of production depreciation method', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'DepreciationMethod'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('VariableType', 'Variable Type', 'Types of financial variables', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('cost', 'Cost', 'Cost variables', 1),
  ('tax', 'Tax', 'Tax rates and variables', 2),
  ('inflation', 'Inflation', 'Inflation rate variables', 3),
  ('exchange_rate', 'Exchange Rate', 'Currency exchange rates', 4),
  ('other', 'Other', 'Other variable types', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'VariableType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('PersonnelType', 'Personnel Type', 'Types of employment arrangements', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('full_time', 'Full Time', 'Full-time employment', 1),
  ('part_time', 'Part Time', 'Part-time employment', 2),
  ('contractor', 'Contractor', 'Contractor or freelancer', 3),
  ('intern', 'Intern', 'Internship position', 4)
) AS v(name, label, description, display_order)
WHERE e.name = 'PersonnelType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('LeasingType', 'Leasing Type', 'Types of leasing arrangements', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('operating', 'Operating', 'Operating lease', 1),
  ('finance', 'Finance', 'Finance lease', 2)
) AS v(name, label, description, display_order)
WHERE e.name = 'LeasingType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('SupplierOrderStatus', 'Supplier Order Status', 'Status of supplier orders', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('pending', 'Pending', 'Order is pending confirmation', 1),
  ('confirmed', 'Confirmed', 'Order has been confirmed', 2),
  ('in_transit', 'In Transit', 'Order is in transit', 3),
  ('delivered', 'Delivered', 'Order has been delivered', 4),
  ('cancelled', 'Cancelled', 'Order has been cancelled', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'SupplierOrderStatus'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('StockMovementType', 'Stock Movement Type', 'Types of stock movements', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('in', 'In', 'Stock received/incoming', 1),
  ('out', 'Out', 'Stock issued/outgoing', 2),
  ('adjustment', 'Adjustment', 'Stock adjustment', 3),
  ('transfer', 'Transfer', 'Stock transfer between locations', 4),
  ('waste', 'Waste', 'Stock waste', 5),
  ('expired', 'Expired', 'Expired stock disposal', 6)
) AS v(name, label, description, display_order)
WHERE e.name = 'StockMovementType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('StockMovementReferenceType', 'Stock Movement Reference Type', 'Reference types for stock movements', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT 
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('supplier_order', 'Supplier Order', 'Related to supplier order', 1),
  ('recipe', 'Recipe', 'Related to recipe usage', 2),
  ('manual', 'Manual', 'Manual entry', 3),
  ('waste', 'Waste', 'Waste entry', 4),
  ('expiry', 'Expiry', 'Expiry disposal', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'StockMovementReferenceType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('PaymentMethod', 'Payment Method', 'Method of payment for payments/entries', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('cash', 'Cash', 'Cash payment', 1),
  ('card', 'Card', 'Card payment', 2),
  ('bank_transfer', 'Bank Transfer', 'Bank transfer', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'PaymentMethod'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('SalaryFrequency', 'Salary Frequency', 'Salary package frequency', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('yearly', 'Yearly', 'Annual salary', 1),
  ('monthly', 'Monthly', 'Monthly salary', 2),
  ('weekly', 'Weekly', 'Weekly salary', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'SalaryFrequency'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('BudgetPeriod', 'Budget Period', 'Budget period', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('monthly', 'Monthly', 'Monthly budget', 1),
  ('quarterly', 'Quarterly', 'Quarterly budget', 2),
  ('yearly', 'Yearly', 'Yearly budget', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'BudgetPeriod'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('EntryType', 'Entry Type', 'Type of cash flow entry', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('sale', 'Sale', 'Sale entry', 1),
  ('loan', 'Loan', 'Loan entry', 2),
  ('leasing', 'Leasing', 'Leasing entry', 3),
  ('expense', 'Expense', 'Expense entry', 4),
  ('subscription', 'Subscription', 'Subscription entry', 5),
  ('subscription_payment', 'Subscription Payment', 'Subscription payment', 6),
  ('loan_payment', 'Loan Payment', 'Loan payment', 7),
  ('leasing_payment', 'Leasing Payment', 'Leasing payment', 8),
  ('personnel', 'Personnel', 'Personnel entry', 9)
) AS v(name, label, description, display_order)
WHERE e.name = 'EntryType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('SyncType', 'Sync Type', 'Square sync/import type', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('orders', 'Orders', 'Orders import', 1),
  ('payments', 'Payments', 'Payments import', 2),
  ('catalog', 'Catalog Items', 'Catalog items import', 3),
  ('locations', 'Locations', 'Locations sync', 4),
  ('full', 'Full', 'Full sync', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'SyncType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('UnitDimension', 'Unit Dimension', 'Physical dimension of unit', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('mass', 'Mass', 'Mass/weight', 1),
  ('volume', 'Volume', 'Volume', 2),
  ('count', 'Count', 'Count/quantity', 3),
  ('other', 'Other', 'Other dimension', 4)
) AS v(name, label, description, display_order)
WHERE e.name = 'UnitDimension'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('ItemCategory', 'Item Category', 'Category for items', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('food', 'Food', 'Food items', 1),
  ('beverage', 'Beverage', 'Beverages', 2),
  ('supplies', 'Supplies', 'Supplies', 3),
  ('other', 'Other', 'Other category', 4)
) AS v(name, label, description, display_order)
WHERE e.name = 'ItemCategory'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('SupplierPaymentTerms', 'Supplier Payment Terms', 'Payment terms for suppliers', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('net_30', 'Net 30', 'Payment due in 30 days', 1),
  ('net_15', 'Net 15', 'Payment due in 15 days', 2),
  ('cod', 'COD', 'Cash on delivery', 3),
  ('due_on_receipt', 'Due on Receipt', 'Due on receipt', 4),
  ('net_60', 'Net 60', 'Payment due in 60 days', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'SupplierPaymentTerms'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('SupplierType', 'Supplier Type', 'Type of supplier', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('supplier', 'Supplier', 'Supplier', 1),
  ('vendor', 'Vendor', 'Vendor', 2),
  ('lender', 'Lender', 'Lender', 3),
  ('customer', 'Customer', 'Customer', 4),
  ('bank', 'Bank', 'Bank', 5),
  ('lessor', 'Lessor', 'Lessor', 6)
) AS v(name, label, description, display_order)
WHERE e.name = 'SupplierType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('PersonnelPosition', 'Personnel Position', 'Job position / role', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('manager', 'Manager', 'Manager', 1),
  ('employee', 'Employee', 'Employee', 2),
  ('contractor', 'Contractor', 'Contractor', 3),
  ('intern', 'Intern', 'Intern', 4),
  ('other', 'Other', 'Other position', 5)
) AS v(name, label, description, display_order)
WHERE e.name = 'PersonnelPosition'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('GlobalDateFilterPreset', 'Global Date Filter Preset', 'Dashboard/global date range preset', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('today', 'Today', 'Today', 1),
  ('yesterday', 'Yesterday', 'Yesterday', 2),
  ('this_week', 'This week', 'This week', 3),
  ('last_week', 'Last week', 'Last week', 4),
  ('this_month', 'This Month', 'Current month', 5),
  ('last_month', 'Last month', 'Last month', 6),
  ('this_quarter', 'This Quarter', 'Current quarter', 7),
  ('last_quarter', 'Last quarter', 'Last quarter', 8),
  ('last_3_months', 'Last 3 months', 'Last 3 months', 9),
  ('last_6_months', 'Last 6 months', 'Last 6 months', 10),
  ('last_12_months', 'Last 12 months', 'Last 12 months', 11),
  ('this_year', 'This Year', 'Current year', 12),
  ('last_year', 'Last year', 'Last year', 13),
  ('custom', 'Custom', 'Custom date range', 14)
) AS v(name, label, description, display_order)
WHERE e.name = 'GlobalDateFilterPreset'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('transaction_tax', 'Transaction Tax', 'Transaction/sales tax rates', 6),
  ('unit', 'Unit', 'Unit of measure', 7)
) AS v(name, label, description, display_order)
WHERE e.name = 'VariableType'
ON CONFLICT (enum_id, name) DO NOTHING;

INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('Role', 'Role', 'User roles', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('member', 'Member', 'Member role', 1),
  ('manager', 'Manager', 'Manager role', 2),
  ('administrator', 'Administrator', 'Administrator role', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'Role'
ON CONFLICT (enum_id, name) DO NOTHING;
