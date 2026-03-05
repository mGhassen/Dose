-- Seed Metadata Enums
-- Populates metadata_enums and metadata_enum_values with financial enums

-- ============================================================================
-- EXPENSE CATEGORY
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

-- ============================================================================
-- EXPENSE RECURRENCE
-- ============================================================================
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

-- ============================================================================
-- SALES TYPE
-- ============================================================================
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

-- ============================================================================
-- LOAN STATUS
-- ============================================================================
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

-- ============================================================================
-- INVESTMENT TYPE
-- ============================================================================
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

-- ============================================================================
-- DEPRECIATION METHOD
-- ============================================================================
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

-- ============================================================================
-- VARIABLE TYPE
-- ============================================================================
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

-- ============================================================================
-- PERSONNEL TYPE
-- ============================================================================
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

-- ============================================================================
-- LEASING TYPE
-- ============================================================================
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

-- ============================================================================
-- SUPPLIER ORDER STATUS
-- ============================================================================
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

-- ============================================================================
-- STOCK MOVEMENT TYPE
-- ============================================================================
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

-- ============================================================================
-- STOCK MOVEMENT REFERENCE TYPE
-- ============================================================================
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


-- Add all domain-list metadata enums per plan: PaymentMethod, SalaryFrequency, BudgetPeriod,
-- EntryType, SyncType, UnitDimension, ItemCategory, SupplierPaymentTerms, SupplierType,
-- PersonnelPosition, GlobalDateFilterPreset

-- PaymentMethod
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

-- SalaryFrequency
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

-- BudgetPeriod
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

-- EntryType (all values for inputs + outputs labels)
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

-- SyncType (Square import)
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

-- UnitDimension (units and variable payload)
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

-- ItemCategory (items.category)
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

-- SupplierPaymentTerms
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

-- SupplierType
INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('SupplierType', 'Supplier Type', 'Type of supplier', true)
ON CONFLICT (name) DO NOTHING;
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('supplier', 'Supplier', 'Supplier', 1),
  ('vendor', 'Vendor', 'Vendor', 2)
) AS v(name, label, description, display_order)
WHERE e.name = 'SupplierType'
ON CONFLICT (enum_id, name) DO NOTHING;

-- PersonnelPosition (seed a few; users can add via metadata-enums admin)
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

-- GlobalDateFilterPreset (matches DatePeriodPreset + custom for dashboard filter)
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
  ('this_year', 'This Year', 'Current year', 9),
  ('last_year', 'Last year', 'Last year', 10),
  ('custom', 'Custom', 'Custom date range', 11)
) AS v(name, label, description, display_order)
WHERE e.name = 'GlobalDateFilterPreset'
ON CONFLICT (enum_id, name) DO NOTHING;



-- Add missing VariableType values (transaction_tax, unit) and Role enum for app-wide metadata enum usage

-- ============================================================================
-- VARIABLE TYPE: add transaction_tax and unit
-- ============================================================================
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

-- ============================================================================
-- ROLE: move from hardcoded API to metadata_enums
-- ============================================================================
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
