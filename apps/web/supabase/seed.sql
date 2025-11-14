-- Seed data for SunnyBudget Financial Tracking Application
-- This file contains sample data for development and testing
-- Run with: supabase db reset (applies migrations then seed.sql)

-- ============================================================================
-- EXPENSES
-- ============================================================================
INSERT INTO expenses (name, category, amount, recurrence, start_date, end_date, description, vendor, is_active) VALUES
('Rent - Main Location', 'rent', 5000.00, 'monthly', '2024-01-01', NULL, 'Monthly rent for main restaurant location', 'Property Management Co.', true),
('Electricity', 'utilities', 800.00, 'monthly', '2024-01-01', NULL, 'Monthly electricity bill', 'Tunisian Electricity Company', true),
('Water', 'utilities', 200.00, 'monthly', '2024-01-01', NULL, 'Monthly water bill', 'SONEDE', true),
('Internet & Phone', 'utilities', 150.00, 'monthly', '2024-01-01', NULL, 'Business internet and phone service', 'Tunisie Telecom', true),
('Kitchen Supplies', 'supplies', 1200.00, 'monthly', '2024-01-01', NULL, 'Monthly kitchen supplies and ingredients', 'Food Supplier Inc.', true),
('Marketing Campaign - Q1', 'marketing', 2000.00, 'quarterly', '2024-01-01', '2024-12-31', 'Quarterly marketing campaign', 'Marketing Agency', true),
('Insurance - Annual', 'insurance', 3000.00, 'yearly', '2024-01-01', NULL, 'Annual business insurance', 'Insurance Co.', true),
('Equipment Maintenance', 'maintenance', 500.00, 'monthly', '2024-01-01', NULL, 'Regular equipment maintenance', 'Maintenance Services', true),
('Legal Services', 'professional_services', 1500.00, 'quarterly', '2024-01-01', NULL, 'Quarterly legal consultation', 'Law Firm', true),
('One-time Setup Cost', 'other', 5000.00, 'one_time', '2024-01-15', NULL, 'Initial setup and installation costs', 'Setup Company', false);

-- ============================================================================
-- LEASING PAYMENTS
-- ============================================================================
INSERT INTO leasing_payments (name, type, amount, start_date, end_date, frequency, description, lessor, is_active) VALUES
('Vehicle Lease - Delivery Van', 'operating', 800.00, '2024-01-01', '2026-12-31', 'monthly', 'Monthly lease for delivery vehicle', 'Auto Lease Co.', true),
('Equipment Lease - Kitchen', 'finance', 1200.00, '2024-01-01', '2027-12-31', 'monthly', 'Kitchen equipment financing lease', 'Equipment Finance', true),
('Office Space Lease', 'operating', 1500.00, '2024-01-01', NULL, 'monthly', 'Office space rental', 'Office Leasing', true);

-- ============================================================================
-- LOANS
-- ============================================================================
INSERT INTO loans (name, loan_number, principal_amount, interest_rate, duration_months, start_date, status, lender, description) VALUES
('Business Startup Loan', 'Emprunt 1', 50000.00, 6.5, 60, '2024-01-01', 'active', 'Bank of Tunisia', 'Initial business startup loan'),
('Equipment Financing', 'Emprunt 2', 30000.00, 5.5, 36, '2024-02-01', 'active', 'Commercial Bank', 'Equipment purchase financing'),
('Expansion Loan', 'Emprunt 3', 75000.00, 7.0, 84, '2024-03-01', 'active', 'Investment Bank', 'Business expansion loan');

-- ============================================================================
-- VARIABLES
-- ============================================================================
INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active) VALUES
('VAT Rate', 'tax', 19.0, 'percentage', '2024-01-01', NULL, 'Value Added Tax rate', true),
('Corporate Tax Rate', 'tax', 25.0, 'percentage', '2024-01-01', NULL, 'Corporate income tax rate', true),
('Inflation Rate', 'inflation', 8.5, 'percentage', '2024-01-01', NULL, 'Annual inflation rate', true),
('EUR to TND Exchange Rate', 'exchange_rate', 3.25, 'rate', '2024-01-01', NULL, 'Euro to Tunisian Dinar exchange rate', true),
('Minimum Wage', 'cost', 450.0, 'TND', '2024-01-01', NULL, 'Minimum monthly wage', true),
('Social Security Rate', 'tax', 18.75, 'percentage', '2024-01-01', NULL, 'Employer social security contribution rate', true);

-- ============================================================================
-- PERSONNEL
-- ============================================================================
INSERT INTO personnel (first_name, last_name, email, position, type, base_salary, employer_charges, employer_charges_type, start_date, end_date, is_active, notes) VALUES
('Ahmed', 'Ben Ali', 'ahmed.benali@restaurant.com', 'Head Chef', 'full_time', 2500.00, 18.75, 'percentage', '2024-01-01', NULL, true, 'Experienced chef with 10+ years'),
('Fatima', 'Trabelsi', 'fatima.trabelsi@restaurant.com', 'Sous Chef', 'full_time', 1800.00, 18.75, 'percentage', '2024-01-15', NULL, true, NULL),
('Mohamed', 'Jebali', 'mohamed.jebali@restaurant.com', 'Waiter', 'full_time', 1200.00, 18.75, 'percentage', '2024-01-01', NULL, true, NULL),
('Salma', 'Khelifi', 'salma.khelifi@restaurant.com', 'Waitress', 'full_time', 1200.00, 18.75, 'percentage', '2024-01-01', NULL, true, NULL),
('Youssef', 'Mansouri', 'youssef.mansouri@restaurant.com', 'Delivery Driver', 'part_time', 800.00, 18.75, 'percentage', '2024-02-01', NULL, true, 'Part-time delivery driver'),
('Amira', 'Bouazizi', 'amira.bouazizi@restaurant.com', 'Cashier', 'full_time', 1000.00, 18.75, 'percentage', '2024-01-01', NULL, true, NULL),
('Karim', 'Hamdi', 'karim.hamdi@restaurant.com', 'Manager', 'full_time', 3500.00, 18.75, 'percentage', '2024-01-01', NULL, true, 'Restaurant manager'),
('Leila', 'Slimani', 'leila.slimani@restaurant.com', 'Accountant', 'contractor', 2000.00, 0, 'fixed', '2024-01-01', NULL, true, 'External accounting services');

-- ============================================================================
-- SALES
-- ============================================================================
-- Sample sales data for January 2024
INSERT INTO sales (date, type, amount, quantity, description) VALUES
('2024-01-01', 'on_site', 850.00, 45, 'New Year opening day'),
('2024-01-02', 'on_site', 720.00, 38, NULL),
('2024-01-03', 'delivery', 450.00, 25, NULL),
('2024-01-04', 'on_site', 980.00, 52, NULL),
('2024-01-05', 'takeaway', 320.00, 18, NULL),
('2024-01-06', 'on_site', 1200.00, 65, 'Weekend special'),
('2024-01-07', 'on_site', 1150.00, 62, NULL),
('2024-01-08', 'delivery', 680.00, 38, NULL),
('2024-01-09', 'on_site', 890.00, 48, NULL),
('2024-01-10', 'catering', 2500.00, 1, 'Corporate event catering'),
('2024-01-11', 'on_site', 950.00, 51, NULL),
('2024-01-12', 'delivery', 520.00, 29, NULL),
('2024-01-13', 'on_site', 1100.00, 59, NULL),
('2024-01-14', 'on_site', 1300.00, 70, 'Weekend special'),
('2024-01-15', 'takeaway', 380.00, 21, NULL),
('2024-01-16', 'on_site', 920.00, 49, NULL),
('2024-01-17', 'delivery', 600.00, 33, NULL),
('2024-01-18', 'on_site', 1050.00, 56, NULL),
('2024-01-19', 'catering', 1800.00, 1, 'Wedding catering'),
('2024-01-20', 'on_site', 980.00, 52, NULL),
('2024-01-21', 'on_site', 1250.00, 67, 'Weekend special'),
('2024-01-22', 'delivery', 750.00, 42, NULL),
('2024-01-23', 'on_site', 890.00, 48, NULL),
('2024-01-24', 'takeaway', 420.00, 23, NULL),
('2024-01-25', 'on_site', 1100.00, 59, NULL),
('2024-01-26', 'on_site', 1350.00, 72, 'Weekend special'),
('2024-01-27', 'delivery', 680.00, 38, NULL),
('2024-01-28', 'on_site', 950.00, 51, NULL),
('2024-01-29', 'catering', 3200.00, 1, 'Large corporate event'),
('2024-01-30', 'on_site', 1020.00, 54, NULL),
('2024-01-31', 'on_site', 1180.00, 63, NULL);

-- ============================================================================
-- INVESTMENTS
-- ============================================================================
INSERT INTO investments (name, type, amount, purchase_date, useful_life_months, depreciation_method, residual_value, description) VALUES
('Commercial Oven', 'equipment', 15000.00, '2024-01-01', 120, 'straight_line', 1500.00, 'Professional commercial oven'),
('Refrigeration System', 'equipment', 12000.00, '2024-01-01', 96, 'straight_line', 1200.00, 'Walk-in refrigerator'),
('Delivery Vehicle', 'vehicle', 35000.00, '2024-02-01', 60, 'declining_balance', 5000.00, 'Delivery van for orders'),
('POS System', 'technology', 5000.00, '2024-01-01', 36, 'straight_line', 500.00, 'Point of sale system'),
('Kitchen Renovation', 'renovation', 45000.00, '2024-01-15', 120, 'straight_line', 0.00, 'Complete kitchen renovation'),
('Dining Area Furniture', 'other', 18000.00, '2024-01-01', 84, 'straight_line', 2000.00, 'Tables, chairs, and decor');

-- ============================================================================
-- CASH FLOW
-- ============================================================================
INSERT INTO cash_flow (month, opening_balance, cash_inflows, cash_outflows, net_cash_flow, closing_balance, notes) VALUES
('2024-01', 10000.00, 35000.00, 28000.00, 7000.00, 17000.00, 'January cash flow'),
('2024-02', 17000.00, 38000.00, 30000.00, 8000.00, 25000.00, 'February cash flow'),
('2024-03', 25000.00, 42000.00, 32000.00, 10000.00, 35000.00, 'March cash flow');

-- ============================================================================
-- WORKING CAPITAL
-- ============================================================================
INSERT INTO working_capital (month, accounts_receivable, inventory, accounts_payable, other_current_assets, other_current_liabilities, working_capital_need) VALUES
('2024-01', 5000.00, 8000.00, 6000.00, 2000.00, 1500.00, 7500.00),
('2024-02', 5500.00, 8500.00, 6500.00, 2200.00, 1600.00, 8000.00),
('2024-03', 6000.00, 9000.00, 7000.00, 2400.00, 1700.00, 8500.00);

-- ============================================================================
-- PROFIT AND LOSS (Sample calculated data)
-- ============================================================================
INSERT INTO profit_and_loss (month, total_revenue, cost_of_goods_sold, operating_expenses, personnel_costs, leasing_costs, depreciation, interest_expense, taxes, other_expenses, gross_profit, operating_profit, net_profit) VALUES
('2024-01', 35000.00, 14000.00, 8500.00, 12000.00, 3500.00, 1200.00, 450.00, 1500.00, 500.00, 21000.00, 10500.00, 8350.00),
('2024-02', 38000.00, 15200.00, 9000.00, 12500.00, 3500.00, 1200.00, 450.00, 1600.00, 550.00, 22800.00, 11050.00, 9100.00),
('2024-03', 42000.00, 16800.00, 9500.00, 13000.00, 3500.00, 1200.00, 450.00, 1700.00, 600.00, 25200.00, 12050.00, 9850.00);

-- ============================================================================
-- BALANCE SHEET (Sample calculated data)
-- ============================================================================
INSERT INTO balance_sheet (month, current_assets, fixed_assets, intangible_assets, total_assets, current_liabilities, long_term_debt, total_liabilities, share_capital, retained_earnings, total_equity) VALUES
('2024-01', 25000.00, 125000.00, 0.00, 150000.00, 15000.00, 155000.00, 170000.00, 50000.00, -20000.00, 30000.00),
('2024-02', 28000.00, 124000.00, 0.00, 152000.00, 16000.00, 154000.00, 170000.00, 50000.00, -18000.00, 32000.00),
('2024-03', 31000.00, 123000.00, 0.00, 154000.00, 17000.00, 153000.00, 170000.00, 50000.00, -15000.00, 35000.00);

-- ============================================================================
-- FINANCIAL PLAN (Sample calculated data)
-- ============================================================================
INSERT INTO financial_plan (month, equity, loans, other_sources, total_sources, investments, working_capital, loan_repayments, other_uses, total_uses, net_financing) VALUES
('2024-01', 50000.00, 155000.00, 0.00, 205000.00, 125000.00, 7500.00, 2500.00, 5000.00, 140000.00, 65000.00),
('2024-02', 50000.00, 154000.00, 0.00, 204000.00, 0.00, 8000.00, 2500.00, 3000.00, 13500.00, 190500.00),
('2024-03', 50000.00, 153000.00, 0.00, 203000.00, 0.00, 8500.00, 2500.00, 3000.00, 14000.00, 189000.00);

-- ============================================================================
-- NOTES
-- ============================================================================
-- This seed data provides:
-- - 10 expenses (various categories and recurrence patterns)
-- - 3 leasing payments (operating and finance leases)
-- - 3 loans (different amounts and terms)
-- - 6 variables (taxes, inflation, exchange rates)
-- - 8 personnel records (various types and positions)
-- - 31 sales records for January 2024 (various types)
-- - 6 investments (equipment, vehicles, renovations)
-- - 3 months of cash flow, working capital, P&L, balance sheet, and financial plan data
--
-- All dates are set to 2024 for consistency
-- All amounts are in Tunisian Dinars (TND)
-- Loan schedules and depreciation entries should be generated via the application
-- Financial statements should be calculated via the application's calculation services

