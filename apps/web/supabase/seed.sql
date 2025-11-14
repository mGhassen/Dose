-- Seed data for SunnyBudget Financial Tracking Application
-- This file contains sample data for development and testing
-- Run with: supabase db reset (applies migrations then seed.sql)

-- ============================================================================
-- EXPENSES
-- ============================================================================
INSERT INTO expenses (name, category, amount, recurrence, start_date, end_date, description, vendor, is_active) VALUES
('Rent - Main Location', 'rent', 5000.00, 'monthly', '2024-01-01', NULL, 'Monthly rent for main restaurant location', 'Property Management Co.', true),
('Rent - Secondary Location', 'rent', 3500.00, 'monthly', '2024-03-01', NULL, 'Monthly rent for secondary location', 'Property Management Co.', true),
('Electricity', 'utilities', 800.00, 'monthly', '2024-01-01', NULL, 'Monthly electricity bill', 'Tunisian Electricity Company', true),
('Electricity - Secondary', 'utilities', 600.00, 'monthly', '2024-03-01', NULL, 'Monthly electricity for secondary location', 'Tunisian Electricity Company', true),
('Water', 'utilities', 200.00, 'monthly', '2024-01-01', NULL, 'Monthly water bill', 'SONEDE', true),
('Water - Secondary', 'utilities', 150.00, 'monthly', '2024-03-01', NULL, 'Monthly water for secondary location', 'SONEDE', true),
('Internet & Phone', 'utilities', 150.00, 'monthly', '2024-01-01', NULL, 'Business internet and phone service', 'Tunisie Telecom', true),
('Internet - Secondary', 'utilities', 120.00, 'monthly', '2024-03-01', NULL, 'Internet for secondary location', 'Tunisie Telecom', true),
('Gas', 'utilities', 300.00, 'monthly', '2024-01-01', NULL, 'Monthly gas bill', 'STEG', true),
('Kitchen Supplies', 'supplies', 1200.00, 'monthly', '2024-01-01', NULL, 'Monthly kitchen supplies and ingredients', 'Food Supplier Inc.', true),
('Kitchen Supplies - Secondary', 'supplies', 800.00, 'monthly', '2024-03-01', NULL, 'Kitchen supplies for secondary location', 'Food Supplier Inc.', true),
('Cleaning Supplies', 'supplies', 250.00, 'monthly', '2024-01-01', NULL, 'Monthly cleaning supplies', 'Cleaning Supply Co.', true),
('Office Supplies', 'supplies', 150.00, 'monthly', '2024-01-01', NULL, 'Monthly office supplies', 'Office Depot', true),
('Marketing Campaign - Q1', 'marketing', 2000.00, 'quarterly', '2024-01-01', '2024-12-31', 'Quarterly marketing campaign', 'Marketing Agency', true),
('Social Media Marketing', 'marketing', 800.00, 'monthly', '2024-01-01', NULL, 'Monthly social media advertising', 'Digital Marketing Co.', true),
('Print Advertising', 'marketing', 500.00, 'monthly', '2024-01-01', NULL, 'Monthly print ads', 'Print Media Co.', true),
('Insurance - Annual', 'insurance', 3000.00, 'yearly', '2024-01-01', NULL, 'Annual business insurance', 'Insurance Co.', true),
('Equipment Insurance', 'insurance', 200.00, 'monthly', '2024-01-01', NULL, 'Monthly equipment insurance', 'Insurance Co.', true),
('Equipment Maintenance', 'maintenance', 500.00, 'monthly', '2024-01-01', NULL, 'Regular equipment maintenance', 'Maintenance Services', true),
('Building Maintenance', 'maintenance', 300.00, 'monthly', '2024-01-01', NULL, 'Monthly building maintenance', 'Maintenance Services', true),
('HVAC Maintenance', 'maintenance', 200.00, 'quarterly', '2024-01-01', NULL, 'Quarterly HVAC maintenance', 'HVAC Services', true),
('Legal Services', 'professional_services', 1500.00, 'quarterly', '2024-01-01', NULL, 'Quarterly legal consultation', 'Law Firm', true),
('Accounting Services', 'professional_services', 1200.00, 'monthly', '2024-01-01', NULL, 'Monthly accounting services', 'Accounting Firm', true),
('Consulting Services', 'professional_services', 1000.00, 'monthly', '2024-02-01', NULL, 'Monthly business consulting', 'Consulting Co.', true),
('One-time Setup Cost', 'other', 5000.00, 'one_time', '2024-01-15', NULL, 'Initial setup and installation costs', 'Setup Company', false),
('Security System', 'other', 2500.00, 'one_time', '2024-02-01', NULL, 'One-time security system installation', 'Security Co.', false),
('Signage', 'other', 1800.00, 'one_time', '2024-01-20', NULL, 'One-time signage installation', 'Signage Co.', false);

-- ============================================================================
-- LEASING PAYMENTS
-- ============================================================================
INSERT INTO leasing_payments (name, type, amount, start_date, end_date, frequency, description, lessor, is_active) VALUES
('Vehicle Lease - Delivery Van', 'operating', 800.00, '2024-01-01', '2026-12-31', 'monthly', 'Monthly lease for delivery vehicle', 'Auto Lease Co.', true),
('Vehicle Lease - Second Van', 'operating', 750.00, '2024-03-01', '2027-02-28', 'monthly', 'Monthly lease for second delivery vehicle', 'Auto Lease Co.', true),
('Equipment Lease - Kitchen', 'finance', 1200.00, '2024-01-01', '2027-12-31', 'monthly', 'Kitchen equipment financing lease', 'Equipment Finance', true),
('Equipment Lease - Refrigeration', 'finance', 900.00, '2024-02-01', '2027-01-31', 'monthly', 'Refrigeration equipment lease', 'Equipment Finance', true),
('Office Space Lease', 'operating', 1500.00, '2024-01-01', NULL, 'monthly', 'Office space rental', 'Office Leasing', true),
('Storage Unit Lease', 'operating', 400.00, '2024-01-01', NULL, 'monthly', 'Monthly storage unit rental', 'Storage Co.', true),
('Equipment Lease - POS Systems', 'finance', 300.00, '2024-01-01', '2026-12-31', 'monthly', 'POS system lease', 'Tech Lease Co.', true);

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
('Leila', 'Slimani', 'leila.slimani@restaurant.com', 'Accountant', 'contractor', 2000.00, 0, 'fixed', '2024-01-01', NULL, true, 'External accounting services'),
('Hassan', 'Mezghani', 'hassan.mezghani@restaurant.com', 'Line Cook', 'full_time', 1400.00, 18.75, 'percentage', '2024-01-01', NULL, true, NULL),
('Nour', 'Ben Ammar', 'nour.benammar@restaurant.com', 'Line Cook', 'full_time', 1400.00, 18.75, 'percentage', '2024-01-15', NULL, true, NULL),
('Omar', 'Chaabane', 'omar.chaabane@restaurant.com', 'Prep Cook', 'full_time', 1100.00, 18.75, 'percentage', '2024-02-01', NULL, true, NULL),
('Ines', 'Ghanmi', 'ines.ghanmi@restaurant.com', 'Waitress', 'full_time', 1200.00, 18.75, 'percentage', '2024-02-01', NULL, true, NULL),
('Mehdi', 'Bouazza', 'mehdi.bouazza@restaurant.com', 'Waiter', 'full_time', 1200.00, 18.75, 'percentage', '2024-02-15', NULL, true, NULL),
('Sana', 'Mahjoub', 'sana.mahjoub@restaurant.com', 'Hostess', 'full_time', 1000.00, 18.75, 'percentage', '2024-01-01', NULL, true, NULL),
('Tarek', 'Bouslama', 'tarek.bouslama@restaurant.com', 'Delivery Driver', 'part_time', 800.00, 18.75, 'percentage', '2024-03-01', NULL, true, 'Part-time delivery driver'),
('Rania', 'Fadhel', 'rania.fadhel@restaurant.com', 'Cashier', 'full_time', 1000.00, 18.75, 'percentage', '2024-02-01', NULL, true, NULL),
('Bilel', 'Khelil', 'bilel.khelil@restaurant.com', 'Assistant Manager', 'full_time', 2200.00, 18.75, 'percentage', '2024-01-01', NULL, true, NULL),
('Hiba', 'Zarrouk', 'hiba.zarrouk@restaurant.com', 'Dishwasher', 'full_time', 900.00, 18.75, 'percentage', '2024-01-01', NULL, true, NULL),
('Wassim', 'Ben Youssef', 'wassim.benyoussef@restaurant.com', 'Dishwasher', 'part_time', 700.00, 18.75, 'percentage', '2024-02-01', NULL, true, 'Part-time dishwasher'),
('Sami', 'Gharbi', 'sami.gharbi@restaurant.com', 'Security Guard', 'contractor', 1500.00, 0, 'fixed', '2024-01-01', NULL, true, 'Night security guard'),
('Lina', 'Bouhlel', 'lina.bouhlel@restaurant.com', 'Marketing Specialist', 'contractor', 1800.00, 0, 'fixed', '2024-01-01', NULL, true, 'Part-time marketing consultant');

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

-- Sample sales data for February 2024
INSERT INTO sales (date, type, amount, quantity, description) VALUES
('2024-02-01', 'on_site', 920.00, 49, NULL),
('2024-02-02', 'delivery', 580.00, 32, NULL),
('2024-02-03', 'on_site', 1050.00, 56, NULL),
('2024-02-04', 'takeaway', 380.00, 21, NULL),
('2024-02-05', 'on_site', 1100.00, 59, NULL),
('2024-02-06', 'on_site', 1280.00, 68, 'Weekend special'),
('2024-02-07', 'on_site', 1220.00, 65, NULL),
('2024-02-08', 'delivery', 720.00, 40, NULL),
('2024-02-09', 'on_site', 980.00, 52, NULL),
('2024-02-10', 'catering', 2800.00, 1, 'Corporate event'),
('2024-02-11', 'on_site', 1020.00, 54, NULL),
('2024-02-12', 'delivery', 650.00, 36, NULL),
('2024-02-13', 'on_site', 1150.00, 61, NULL),
('2024-02-14', 'on_site', 1400.00, 75, 'Valentine''s Day special'),
('2024-02-15', 'takeaway', 420.00, 23, NULL),
('2024-02-16', 'on_site', 1080.00, 57, NULL),
('2024-02-17', 'delivery', 680.00, 38, NULL),
('2024-02-18', 'on_site', 1120.00, 60, NULL),
('2024-02-19', 'catering', 2200.00, 1, 'Wedding catering'),
('2024-02-20', 'on_site', 990.00, 53, NULL),
('2024-02-21', 'on_site', 1320.00, 70, 'Weekend special'),
('2024-02-22', 'delivery', 750.00, 42, NULL),
('2024-02-23', 'on_site', 950.00, 51, NULL),
('2024-02-24', 'takeaway', 400.00, 22, NULL),
('2024-02-25', 'on_site', 1180.00, 63, NULL),
('2024-02-26', 'on_site', 1380.00, 73, 'Weekend special'),
('2024-02-27', 'delivery', 700.00, 39, NULL),
('2024-02-28', 'on_site', 1050.00, 56, NULL),
('2024-02-29', 'on_site', 1200.00, 64, 'Leap year special');

-- Sample sales data for March 2024
INSERT INTO sales (date, type, amount, quantity, description) VALUES
('2024-03-01', 'on_site', 1100.00, 59, NULL),
('2024-03-02', 'delivery', 620.00, 34, NULL),
('2024-03-03', 'on_site', 1080.00, 57, NULL),
('2024-03-04', 'takeaway', 390.00, 21, NULL),
('2024-03-05', 'on_site', 1120.00, 60, NULL),
('2024-03-06', 'on_site', 1300.00, 69, 'Weekend special'),
('2024-03-07', 'on_site', 1250.00, 66, NULL),
('2024-03-08', 'delivery', 740.00, 41, 'International Women''s Day'),
('2024-03-09', 'on_site', 1000.00, 53, NULL),
('2024-03-10', 'catering', 3000.00, 1, 'Large corporate event'),
('2024-03-11', 'on_site', 1040.00, 55, NULL),
('2024-03-12', 'delivery', 660.00, 37, NULL),
('2024-03-13', 'on_site', 1170.00, 62, NULL),
('2024-03-14', 'on_site', 1350.00, 72, 'Weekend special'),
('2024-03-15', 'takeaway', 430.00, 24, NULL),
('2024-03-16', 'on_site', 1090.00, 58, NULL),
('2024-03-17', 'delivery', 690.00, 38, NULL),
('2024-03-18', 'on_site', 1130.00, 60, NULL),
('2024-03-19', 'catering', 2400.00, 1, 'Corporate lunch'),
('2024-03-20', 'on_site', 1010.00, 54, NULL),
('2024-03-21', 'on_site', 1340.00, 71, 'Weekend special'),
('2024-03-22', 'delivery', 760.00, 42, NULL),
('2024-03-23', 'on_site', 960.00, 51, NULL),
('2024-03-24', 'takeaway', 410.00, 23, NULL),
('2024-03-25', 'on_site', 1190.00, 63, NULL),
('2024-03-26', 'on_site', 1390.00, 74, 'Weekend special'),
('2024-03-27', 'delivery', 710.00, 39, NULL),
('2024-03-28', 'on_site', 1060.00, 56, NULL),
('2024-03-29', 'on_site', 1210.00, 64, NULL),
('2024-03-30', 'on_site', 1420.00, 75, 'Weekend special'),
('2024-03-31', 'on_site', 1280.00, 68, NULL);

-- Sample sales data for April 2024
INSERT INTO sales (date, type, amount, quantity, description) VALUES
('2024-04-01', 'on_site', 1150.00, 61, NULL),
('2024-04-02', 'delivery', 640.00, 35, NULL),
('2024-04-03', 'on_site', 1100.00, 58, NULL),
('2024-04-04', 'takeaway', 400.00, 22, NULL),
('2024-04-05', 'on_site', 1140.00, 60, NULL),
('2024-04-06', 'on_site', 1320.00, 70, 'Weekend special'),
('2024-04-07', 'on_site', 1280.00, 68, NULL),
('2024-04-08', 'delivery', 760.00, 42, NULL),
('2024-04-09', 'on_site', 1020.00, 54, NULL),
('2024-04-10', 'catering', 3100.00, 1, 'Corporate event'),
('2024-04-11', 'on_site', 1060.00, 56, NULL),
('2024-04-12', 'delivery', 680.00, 38, NULL),
('2024-04-13', 'on_site', 1200.00, 64, NULL),
('2024-04-14', 'on_site', 1380.00, 73, 'Weekend special'),
('2024-04-15', 'takeaway', 440.00, 24, NULL),
('2024-04-16', 'on_site', 1110.00, 59, NULL),
('2024-04-17', 'delivery', 700.00, 39, NULL),
('2024-04-18', 'on_site', 1160.00, 62, NULL),
('2024-04-19', 'catering', 2600.00, 1, 'Wedding catering'),
('2024-04-20', 'on_site', 1030.00, 55, NULL),
('2024-04-21', 'on_site', 1360.00, 72, 'Weekend special'),
('2024-04-22', 'delivery', 780.00, 43, NULL),
('2024-04-23', 'on_site', 980.00, 52, NULL),
('2024-04-24', 'takeaway', 420.00, 23, NULL),
('2024-04-25', 'on_site', 1220.00, 65, NULL),
('2024-04-26', 'on_site', 1410.00, 75, 'Weekend special'),
('2024-04-27', 'delivery', 720.00, 40, NULL),
('2024-04-28', 'on_site', 1080.00, 57, NULL),
('2024-04-29', 'on_site', 1240.00, 66, NULL),
('2024-04-30', 'on_site', 1300.00, 69, NULL);

-- Sample sales data for May 2024
INSERT INTO sales (date, type, amount, quantity, description) VALUES
('2024-05-01', 'on_site', 1180.00, 63, 'Labor Day'),
('2024-05-02', 'delivery', 660.00, 37, NULL),
('2024-05-03', 'on_site', 1120.00, 60, NULL),
('2024-05-04', 'takeaway', 410.00, 23, NULL),
('2024-05-05', 'on_site', 1150.00, 61, NULL),
('2024-05-06', 'on_site', 1340.00, 71, 'Weekend special'),
('2024-05-07', 'on_site', 1300.00, 69, NULL),
('2024-05-08', 'delivery', 740.00, 41, NULL),
('2024-05-09', 'on_site', 1040.00, 55, NULL),
('2024-05-10', 'catering', 3200.00, 1, 'Large corporate event'),
('2024-05-11', 'on_site', 1070.00, 57, NULL),
('2024-05-12', 'delivery', 690.00, 38, NULL),
('2024-05-13', 'on_site', 1210.00, 64, NULL),
('2024-05-14', 'on_site', 1390.00, 74, 'Weekend special'),
('2024-05-15', 'takeaway', 430.00, 24, NULL),
('2024-05-16', 'on_site', 1130.00, 60, NULL),
('2024-05-17', 'delivery', 710.00, 39, NULL),
('2024-05-18', 'on_site', 1170.00, 62, NULL),
('2024-05-19', 'catering', 2700.00, 1, 'Corporate lunch'),
('2024-05-20', 'on_site', 1050.00, 56, NULL),
('2024-05-21', 'on_site', 1370.00, 73, 'Weekend special'),
('2024-05-22', 'delivery', 790.00, 44, NULL),
('2024-05-23', 'on_site', 990.00, 53, NULL),
('2024-05-24', 'takeaway', 450.00, 25, NULL),
('2024-05-25', 'on_site', 1230.00, 65, NULL),
('2024-05-26', 'on_site', 1420.00, 75, 'Weekend special'),
('2024-05-27', 'delivery', 730.00, 40, NULL),
('2024-05-28', 'on_site', 1090.00, 58, NULL),
('2024-05-29', 'on_site', 1250.00, 66, NULL),
('2024-05-30', 'on_site', 1310.00, 70, NULL),
('2024-05-31', 'on_site', 1270.00, 67, NULL);

-- Sample sales data for June 2024
INSERT INTO sales (date, type, amount, quantity, description) VALUES
('2024-06-01', 'on_site', 1200.00, 64, NULL),
('2024-06-02', 'delivery', 670.00, 37, NULL),
('2024-06-03', 'on_site', 1130.00, 60, NULL),
('2024-06-04', 'takeaway', 420.00, 23, NULL),
('2024-06-05', 'on_site', 1160.00, 62, NULL),
('2024-06-06', 'on_site', 1350.00, 72, 'Weekend special'),
('2024-06-07', 'on_site', 1310.00, 70, NULL),
('2024-06-08', 'delivery', 750.00, 42, NULL),
('2024-06-09', 'on_site', 1050.00, 56, NULL),
('2024-06-10', 'catering', 3300.00, 1, 'Large corporate event'),
('2024-06-11', 'on_site', 1080.00, 57, NULL),
('2024-06-12', 'delivery', 700.00, 39, NULL),
('2024-06-13', 'on_site', 1220.00, 65, NULL),
('2024-06-14', 'on_site', 1400.00, 74, 'Weekend special'),
('2024-06-15', 'takeaway', 440.00, 24, NULL),
('2024-06-16', 'on_site', 1140.00, 61, NULL),
('2024-06-17', 'delivery', 720.00, 40, NULL),
('2024-06-18', 'on_site', 1180.00, 63, NULL),
('2024-06-19', 'catering', 2800.00, 1, 'Wedding catering'),
('2024-06-20', 'on_site', 1060.00, 56, NULL),
('2024-06-21', 'on_site', 1380.00, 73, 'Weekend special'),
('2024-06-22', 'delivery', 800.00, 44, NULL),
('2024-06-23', 'on_site', 1000.00, 53, NULL),
('2024-06-24', 'takeaway', 460.00, 25, NULL),
('2024-06-25', 'on_site', 1240.00, 66, NULL),
('2024-06-26', 'on_site', 1430.00, 76, 'Weekend special'),
('2024-06-27', 'delivery', 740.00, 41, NULL),
('2024-06-28', 'on_site', 1100.00, 58, NULL),
('2024-06-29', 'on_site', 1260.00, 67, NULL),
('2024-06-30', 'on_site', 1320.00, 70, NULL);

-- ============================================================================
-- INVESTMENTS
-- ============================================================================
INSERT INTO investments (name, type, amount, purchase_date, useful_life_months, depreciation_method, residual_value, description) VALUES
('Commercial Oven', 'equipment', 15000.00, '2024-01-01', 120, 'straight_line', 1500.00, 'Professional commercial oven'),
('Refrigeration System', 'equipment', 12000.00, '2024-01-01', 96, 'straight_line', 1200.00, 'Walk-in refrigerator'),
('Delivery Vehicle', 'vehicle', 35000.00, '2024-02-01', 60, 'declining_balance', 5000.00, 'Delivery van for orders'),
('POS System', 'technology', 5000.00, '2024-01-01', 36, 'straight_line', 500.00, 'Point of sale system'),
('Kitchen Renovation', 'renovation', 45000.00, '2024-01-15', 120, 'straight_line', 0.00, 'Complete kitchen renovation'),
('Dining Area Furniture', 'other', 18000.00, '2024-01-01', 84, 'straight_line', 2000.00, 'Tables, chairs, and decor'),
('Second Commercial Oven', 'equipment', 15000.00, '2024-03-01', 120, 'straight_line', 1500.00, 'Second professional commercial oven'),
('Dishwasher Machine', 'equipment', 8000.00, '2024-02-01', 84, 'straight_line', 800.00, 'Commercial dishwasher'),
('Food Processor', 'equipment', 3000.00, '2024-01-01', 60, 'straight_line', 300.00, 'Commercial food processor'),
('Coffee Machine', 'equipment', 4500.00, '2024-01-01', 48, 'straight_line', 450.00, 'Professional coffee machine'),
('Second Delivery Vehicle', 'vehicle', 32000.00, '2024-04-01', 60, 'declining_balance', 4500.00, 'Second delivery van'),
('Tablet POS Systems', 'technology', 6000.00, '2024-02-01', 36, 'straight_line', 600.00, 'Tablet-based POS systems'),
('Bathroom Renovation', 'renovation', 12000.00, '2024-02-01', 120, 'straight_line', 0.00, 'Bathroom renovation'),
('Outdoor Seating Furniture', 'other', 15000.00, '2024-03-01', 84, 'straight_line', 1500.00, 'Outdoor tables and chairs');

-- ============================================================================
-- CASH FLOW
-- ============================================================================
INSERT INTO cash_flow (month, opening_balance, cash_inflows, cash_outflows, net_cash_flow, closing_balance, notes) VALUES
('2024-01', 10000.00, 35000.00, 28000.00, 7000.00, 17000.00, 'January cash flow'),
('2024-02', 17000.00, 38000.00, 30000.00, 8000.00, 25000.00, 'February cash flow'),
('2024-03', 25000.00, 42000.00, 32000.00, 10000.00, 35000.00, 'March cash flow'),
('2024-04', 35000.00, 44000.00, 34000.00, 10000.00, 45000.00, 'April cash flow'),
('2024-05', 45000.00, 46000.00, 36000.00, 10000.00, 55000.00, 'May cash flow'),
('2024-06', 55000.00, 48000.00, 38000.00, 10000.00, 65000.00, 'June cash flow'),
('2024-07', 65000.00, 50000.00, 40000.00, 10000.00, 75000.00, 'July cash flow'),
('2024-08', 75000.00, 52000.00, 42000.00, 10000.00, 85000.00, 'August cash flow'),
('2024-09', 85000.00, 54000.00, 44000.00, 10000.00, 95000.00, 'September cash flow'),
('2024-10', 95000.00, 56000.00, 46000.00, 10000.00, 105000.00, 'October cash flow'),
('2024-11', 105000.00, 58000.00, 48000.00, 10000.00, 115000.00, 'November cash flow'),
('2024-12', 115000.00, 60000.00, 50000.00, 10000.00, 125000.00, 'December cash flow');

-- ============================================================================
-- WORKING CAPITAL
-- ============================================================================
INSERT INTO working_capital (month, accounts_receivable, inventory, accounts_payable, other_current_assets, other_current_liabilities, working_capital_need) VALUES
('2024-01', 5000.00, 8000.00, 6000.00, 2000.00, 1500.00, 7500.00),
('2024-02', 5500.00, 8500.00, 6500.00, 2200.00, 1600.00, 8000.00),
('2024-03', 6000.00, 9000.00, 7000.00, 2400.00, 1700.00, 8500.00),
('2024-04', 6500.00, 9500.00, 7500.00, 2600.00, 1800.00, 9000.00),
('2024-05', 7000.00, 10000.00, 8000.00, 2800.00, 1900.00, 9500.00),
('2024-06', 7500.00, 10500.00, 8500.00, 3000.00, 2000.00, 10000.00),
('2024-07', 8000.00, 11000.00, 9000.00, 3200.00, 2100.00, 10500.00),
('2024-08', 8500.00, 11500.00, 9500.00, 3400.00, 2200.00, 11000.00),
('2024-09', 9000.00, 12000.00, 10000.00, 3600.00, 2300.00, 11500.00),
('2024-10', 9500.00, 12500.00, 10500.00, 3800.00, 2400.00, 12000.00),
('2024-11', 10000.00, 13000.00, 11000.00, 4000.00, 2500.00, 12500.00),
('2024-12', 10500.00, 13500.00, 11500.00, 4200.00, 2600.00, 13000.00);

-- ============================================================================
-- PROFIT AND LOSS (Sample calculated data)
-- ============================================================================
INSERT INTO profit_and_loss (month, total_revenue, cost_of_goods_sold, operating_expenses, personnel_costs, leasing_costs, depreciation, interest_expense, taxes, other_expenses, gross_profit, operating_profit, net_profit) VALUES
('2024-01', 35000.00, 14000.00, 8500.00, 12000.00, 3500.00, 1200.00, 450.00, 1500.00, 500.00, 21000.00, 10500.00, 8350.00),
('2024-02', 38000.00, 15200.00, 9000.00, 12500.00, 3500.00, 1200.00, 450.00, 1600.00, 550.00, 22800.00, 11050.00, 9100.00),
('2024-03', 42000.00, 16800.00, 9500.00, 13000.00, 3500.00, 1200.00, 450.00, 1700.00, 600.00, 25200.00, 12050.00, 9850.00),
('2024-04', 44000.00, 17600.00, 10000.00, 13500.00, 4250.00, 1400.00, 450.00, 1800.00, 650.00, 26400.00, 12600.00, 10350.00),
('2024-05', 46000.00, 18400.00, 10500.00, 14000.00, 4250.00, 1400.00, 450.00, 1900.00, 700.00, 27600.00, 13150.00, 10850.00),
('2024-06', 48000.00, 19200.00, 11000.00, 14500.00, 4250.00, 1400.00, 450.00, 2000.00, 750.00, 28800.00, 13700.00, 11350.00),
('2024-07', 50000.00, 20000.00, 11500.00, 15000.00, 4250.00, 1400.00, 450.00, 2100.00, 800.00, 30000.00, 14250.00, 11850.00),
('2024-08', 52000.00, 20800.00, 12000.00, 15500.00, 4250.00, 1400.00, 450.00, 2200.00, 850.00, 31200.00, 14800.00, 12350.00),
('2024-09', 54000.00, 21600.00, 12500.00, 16000.00, 4250.00, 1400.00, 450.00, 2300.00, 900.00, 32400.00, 15350.00, 12850.00),
('2024-10', 56000.00, 22400.00, 13000.00, 16500.00, 4250.00, 1400.00, 450.00, 2400.00, 950.00, 33600.00, 15900.00, 13350.00),
('2024-11', 58000.00, 23200.00, 13500.00, 17000.00, 4250.00, 1400.00, 450.00, 2500.00, 1000.00, 34800.00, 16450.00, 13850.00),
('2024-12', 60000.00, 24000.00, 14000.00, 17500.00, 4250.00, 1400.00, 450.00, 2600.00, 1050.00, 36000.00, 17000.00, 14350.00);

-- ============================================================================
-- BALANCE SHEET (Sample calculated data)
-- ============================================================================
INSERT INTO balance_sheet (month, current_assets, fixed_assets, intangible_assets, total_assets, current_liabilities, long_term_debt, total_liabilities, share_capital, retained_earnings, total_equity) VALUES
('2024-01', 25000.00, 125000.00, 0.00, 150000.00, 15000.00, 155000.00, 170000.00, 50000.00, -20000.00, 30000.00),
('2024-02', 28000.00, 124000.00, 0.00, 152000.00, 16000.00, 154000.00, 170000.00, 50000.00, -18000.00, 32000.00),
('2024-03', 31000.00, 123000.00, 0.00, 154000.00, 17000.00, 153000.00, 170000.00, 50000.00, -15000.00, 35000.00),
('2024-04', 34000.00, 122000.00, 0.00, 156000.00, 18000.00, 152000.00, 170000.00, 50000.00, -12000.00, 38000.00),
('2024-05', 37000.00, 121000.00, 0.00, 158000.00, 19000.00, 151000.00, 170000.00, 50000.00, -9000.00, 41000.00),
('2024-06', 40000.00, 120000.00, 0.00, 160000.00, 20000.00, 150000.00, 170000.00, 50000.00, -6000.00, 44000.00),
('2024-07', 43000.00, 119000.00, 0.00, 162000.00, 21000.00, 149000.00, 170000.00, 50000.00, -3000.00, 47000.00),
('2024-08', 46000.00, 118000.00, 0.00, 164000.00, 22000.00, 148000.00, 170000.00, 50000.00, 0.00, 50000.00),
('2024-09', 49000.00, 117000.00, 0.00, 166000.00, 23000.00, 147000.00, 170000.00, 50000.00, 3000.00, 53000.00),
('2024-10', 52000.00, 116000.00, 0.00, 168000.00, 24000.00, 146000.00, 170000.00, 50000.00, 6000.00, 56000.00),
('2024-11', 55000.00, 115000.00, 0.00, 170000.00, 25000.00, 145000.00, 170000.00, 50000.00, 9000.00, 59000.00),
('2024-12', 58000.00, 114000.00, 0.00, 172000.00, 26000.00, 144000.00, 170000.00, 50000.00, 12000.00, 62000.00);

-- ============================================================================
-- FINANCIAL PLAN (Sample calculated data)
-- ============================================================================
INSERT INTO financial_plan (month, equity, loans, other_sources, total_sources, investments, working_capital, loan_repayments, other_uses, total_uses, net_financing) VALUES
('2024-01', 50000.00, 155000.00, 0.00, 205000.00, 125000.00, 7500.00, 2500.00, 5000.00, 140000.00, 65000.00),
('2024-02', 50000.00, 154000.00, 0.00, 204000.00, 0.00, 8000.00, 2500.00, 3000.00, 13500.00, 190500.00),
('2024-03', 50000.00, 153000.00, 0.00, 203000.00, 0.00, 8500.00, 2500.00, 3000.00, 14000.00, 189000.00),
('2024-04', 50000.00, 152000.00, 0.00, 202000.00, 0.00, 9000.00, 2500.00, 3000.00, 14500.00, 187500.00),
('2024-05', 50000.00, 151000.00, 0.00, 201000.00, 0.00, 9500.00, 2500.00, 3000.00, 15000.00, 186000.00),
('2024-06', 50000.00, 150000.00, 0.00, 200000.00, 0.00, 10000.00, 2500.00, 3000.00, 15500.00, 184500.00),
('2024-07', 50000.00, 149000.00, 0.00, 199000.00, 0.00, 10500.00, 2500.00, 3000.00, 16000.00, 183000.00),
('2024-08', 50000.00, 148000.00, 0.00, 198000.00, 0.00, 11000.00, 2500.00, 3000.00, 16500.00, 181500.00),
('2024-09', 50000.00, 147000.00, 0.00, 197000.00, 0.00, 11500.00, 2500.00, 3000.00, 17000.00, 180000.00),
('2024-10', 50000.00, 146000.00, 0.00, 196000.00, 0.00, 12000.00, 2500.00, 3000.00, 17500.00, 178500.00),
('2024-11', 50000.00, 145000.00, 0.00, 195000.00, 0.00, 12500.00, 2500.00, 3000.00, 18000.00, 177000.00),
('2024-12', 50000.00, 144000.00, 0.00, 194000.00, 0.00, 13000.00, 2500.00, 3000.00, 18500.00, 175500.00);

-- ============================================================================
-- LOAN SCHEDULES
-- ============================================================================
-- Loan schedules for Business Startup Loan (loan_id = 1, 60 months, 6.5% interest)
INSERT INTO loan_schedules (loan_id, month, payment_date, principal_payment, interest_payment, total_payment, remaining_balance, is_paid, paid_date) VALUES
(1, 1, '2024-02-01', 770.83, 270.83, 1041.66, 49229.17, true, '2024-02-01'),
(1, 2, '2024-03-01', 775.01, 266.65, 1041.66, 48454.16, true, '2024-03-01'),
(1, 3, '2024-04-01', 779.21, 262.45, 1041.66, 47674.95, true, '2024-04-01'),
(1, 4, '2024-05-01', 783.43, 258.23, 1041.66, 46891.52, true, '2024-05-01'),
(1, 5, '2024-06-01', 787.67, 253.99, 1041.66, 46103.85, true, '2024-06-01'),
(1, 6, '2024-07-01', 791.93, 249.73, 1041.66, 45311.92, false, NULL),
(1, 7, '2024-08-01', 796.25, 245.41, 1041.66, 44515.67, false, NULL),
(1, 8, '2024-09-01', 800.59, 241.07, 1041.66, 43715.08, false, NULL),
(1, 9, '2024-10-01', 804.96, 236.70, 1041.66, 42910.12, false, NULL),
(1, 10, '2024-11-01', 809.35, 232.31, 1041.66, 42100.77, false, NULL),
(1, 11, '2024-12-01', 813.77, 227.89, 1041.66, 41287.00, false, NULL),
(1, 12, '2025-01-01', 818.21, 223.45, 1041.66, 40468.79, false, NULL);

-- Loan schedules for Equipment Financing (loan_id = 2, 36 months, 5.5% interest)
INSERT INTO loan_schedules (loan_id, month, payment_date, principal_payment, interest_payment, total_payment, remaining_balance, is_paid, paid_date) VALUES
(2, 1, '2024-03-01', 812.50, 137.50, 950.00, 29187.50, true, '2024-03-01'),
(2, 2, '2024-04-01', 816.22, 133.78, 950.00, 28371.28, true, '2024-04-01'),
(2, 3, '2024-05-01', 819.96, 130.04, 950.00, 27551.32, true, '2024-05-01'),
(2, 4, '2024-06-01', 823.72, 126.28, 950.00, 26727.60, false, NULL),
(2, 5, '2024-07-01', 827.50, 122.50, 950.00, 25900.10, false, NULL),
(2, 6, '2024-08-01', 831.30, 118.70, 950.00, 25068.80, false, NULL),
(2, 7, '2024-09-01', 835.12, 114.88, 950.00, 24233.68, false, NULL),
(2, 8, '2024-10-01', 838.96, 111.04, 950.00, 23394.72, false, NULL),
(2, 9, '2024-11-01', 842.82, 107.18, 950.00, 22551.90, false, NULL),
(2, 10, '2024-12-01', 846.70, 103.30, 950.00, 21705.20, false, NULL);

-- Loan schedules for Expansion Loan (loan_id = 3, 84 months, 7.0% interest)
INSERT INTO loan_schedules (loan_id, month, payment_date, principal_payment, interest_payment, total_payment, remaining_balance, is_paid, paid_date) VALUES
(3, 1, '2024-04-01', 714.29, 437.50, 1151.79, 74285.71, true, '2024-04-01'),
(3, 2, '2024-05-01', 719.45, 432.34, 1151.79, 73566.26, true, '2024-05-01'),
(3, 3, '2024-06-01', 724.65, 427.14, 1151.79, 72841.61, false, NULL),
(3, 4, '2024-07-01', 729.90, 421.89, 1151.79, 72111.71, false, NULL),
(3, 5, '2024-08-01', 735.19, 416.60, 1151.79, 71376.52, false, NULL),
(3, 6, '2024-09-01', 740.53, 411.26, 1151.79, 70635.99, false, NULL),
(3, 7, '2024-10-01', 745.91, 405.88, 1151.79, 69890.08, false, NULL),
(3, 8, '2024-11-01', 751.34, 400.45, 1151.79, 69138.74, false, NULL),
(3, 9, '2024-12-01', 756.81, 394.98, 1151.79, 68381.93, false, NULL);

-- ============================================================================
-- DEPRECIATION ENTRIES
-- ============================================================================
-- Depreciation for Commercial Oven (investment_id = 1, straight line, 120 months)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(1, '2024-01', 112.50, 112.50, 14887.50),
(1, '2024-02', 112.50, 225.00, 14775.00),
(1, '2024-03', 112.50, 337.50, 14662.50),
(1, '2024-04', 112.50, 450.00, 14550.00),
(1, '2024-05', 112.50, 562.50, 14437.50),
(1, '2024-06', 112.50, 675.00, 14325.00);

-- Depreciation for Refrigeration System (investment_id = 2, straight line, 96 months)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(2, '2024-01', 112.50, 112.50, 11887.50),
(2, '2024-02', 112.50, 225.00, 11775.00),
(2, '2024-03', 112.50, 337.50, 11662.50),
(2, '2024-04', 112.50, 450.00, 11550.00),
(2, '2024-05', 112.50, 562.50, 11437.50),
(2, '2024-06', 112.50, 675.00, 11325.00);

-- Depreciation for Delivery Vehicle (investment_id = 3, declining balance, 60 months)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(3, '2024-02', 1166.67, 1166.67, 33833.33),
(3, '2024-03', 1127.78, 2294.45, 32705.55),
(3, '2024-04', 1090.19, 3384.64, 31615.36),
(3, '2024-05', 1053.85, 4438.49, 30561.51),
(3, '2024-06', 1018.72, 5457.21, 29542.79);

-- Depreciation for POS System (investment_id = 4, straight line, 36 months)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(4, '2024-01', 125.00, 125.00, 4875.00),
(4, '2024-02', 125.00, 250.00, 4750.00),
(4, '2024-03', 125.00, 375.00, 4625.00),
(4, '2024-04', 125.00, 500.00, 4500.00),
(4, '2024-05', 125.00, 625.00, 4375.00),
(4, '2024-06', 125.00, 750.00, 4250.00);

-- Depreciation for Kitchen Renovation (investment_id = 5, straight line, 120 months)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(5, '2024-01', 375.00, 375.00, 44625.00),
(5, '2024-02', 375.00, 750.00, 44250.00),
(5, '2024-03', 375.00, 1125.00, 43875.00),
(5, '2024-04', 375.00, 1500.00, 43500.00),
(5, '2024-05', 375.00, 1875.00, 43125.00),
(5, '2024-06', 375.00, 2250.00, 42750.00);

-- Depreciation for Dining Area Furniture (investment_id = 6, straight line, 84 months)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(6, '2024-01', 190.48, 190.48, 17809.52),
(6, '2024-02', 190.48, 380.96, 17619.04),
(6, '2024-03', 190.48, 571.44, 17428.56),
(6, '2024-04', 190.48, 761.92, 17238.08),
(6, '2024-05', 190.48, 952.40, 17047.60),
(6, '2024-06', 190.48, 1142.88, 16857.12);

-- Depreciation for additional investments
-- Second Commercial Oven (investment_id = 7)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(7, '2024-03', 112.50, 112.50, 14887.50),
(7, '2024-04', 112.50, 225.00, 14775.00),
(7, '2024-05', 112.50, 337.50, 14662.50),
(7, '2024-06', 112.50, 450.00, 14550.00);

-- Dishwasher Machine (investment_id = 8)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(8, '2024-02', 85.71, 85.71, 7914.29),
(8, '2024-03', 85.71, 171.42, 7828.58),
(8, '2024-04', 85.71, 257.13, 7742.87),
(8, '2024-05', 85.71, 342.84, 7657.16),
(8, '2024-06', 85.71, 428.55, 7571.45);

-- Food Processor (investment_id = 9)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(9, '2024-01', 45.00, 45.00, 2955.00),
(9, '2024-02', 45.00, 90.00, 2910.00),
(9, '2024-03', 45.00, 135.00, 2865.00),
(9, '2024-04', 45.00, 180.00, 2820.00),
(9, '2024-05', 45.00, 225.00, 2775.00),
(9, '2024-06', 45.00, 270.00, 2730.00);

-- Coffee Machine (investment_id = 10)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(10, '2024-01', 84.38, 84.38, 4415.62),
(10, '2024-02', 84.38, 168.76, 4331.24),
(10, '2024-03', 84.38, 253.14, 4246.86),
(10, '2024-04', 84.38, 337.52, 4162.48),
(10, '2024-05', 84.38, 421.90, 4078.10),
(10, '2024-06', 84.38, 506.28, 3993.72);

-- Second Delivery Vehicle (investment_id = 11)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(11, '2024-04', 1066.67, 1066.67, 30933.33),
(11, '2024-05', 1031.11, 2097.78, 29902.22),
(11, '2024-06', 996.74, 3094.52, 28905.48);

-- Tablet POS Systems (investment_id = 12)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(12, '2024-02', 150.00, 150.00, 5850.00),
(12, '2024-03', 150.00, 300.00, 5700.00),
(12, '2024-04', 150.00, 450.00, 5550.00),
(12, '2024-05', 150.00, 600.00, 5400.00),
(12, '2024-06', 150.00, 750.00, 5250.00);

-- Bathroom Renovation (investment_id = 13)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(13, '2024-02', 100.00, 100.00, 11900.00),
(13, '2024-03', 100.00, 200.00, 11800.00),
(13, '2024-04', 100.00, 300.00, 11700.00),
(13, '2024-05', 100.00, 400.00, 11600.00),
(13, '2024-06', 100.00, 500.00, 11500.00);

-- Outdoor Seating Furniture (investment_id = 14)
INSERT INTO depreciation_entries (investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES
(14, '2024-03', 178.57, 178.57, 14821.43),
(14, '2024-04', 178.57, 357.14, 14642.86),
(14, '2024-05', 178.57, 535.71, 14464.29),
(14, '2024-06', 178.57, 714.28, 14285.72);

-- ============================================================================
-- BUDGET PROJECTIONS
-- ============================================================================
-- Expense projections for January 2024
INSERT INTO budget_projections (projection_type, reference_id, month, amount, category, is_projected) VALUES
('expense', 1, '2024-01', 5000.00, 'rent', false),
('expense', 2, '2024-01', 800.00, 'utilities', false),
('expense', 3, '2024-01', 200.00, 'utilities', false),
('expense', 4, '2024-01', 150.00, 'utilities', false),
('expense', 5, '2024-01', 1200.00, 'supplies', false),
('expense', 6, '2024-01', 2000.00, 'marketing', false),
('expense', 7, '2024-01', 250.00, 'insurance', false),
('expense', 8, '2024-01', 500.00, 'maintenance', false);

-- Expense projections for February 2024
INSERT INTO budget_projections (projection_type, reference_id, month, amount, category, is_projected) VALUES
('expense', 1, '2024-02', 5000.00, 'rent', false),
('expense', 2, '2024-02', 800.00, 'utilities', false),
('expense', 3, '2024-02', 200.00, 'utilities', false),
('expense', 4, '2024-02', 150.00, 'utilities', false),
('expense', 5, '2024-02', 1200.00, 'supplies', false),
('expense', 8, '2024-02', 500.00, 'maintenance', false);

-- Expense projections for March 2024
INSERT INTO budget_projections (projection_type, reference_id, month, amount, category, is_projected) VALUES
('expense', 1, '2024-03', 5000.00, 'rent', false),
('expense', 2, '2024-03', 800.00, 'utilities', false),
('expense', 3, '2024-03', 200.00, 'utilities', false),
('expense', 4, '2024-03', 150.00, 'utilities', false),
('expense', 5, '2024-03', 1200.00, 'supplies', false),
('expense', 6, '2024-03', 2000.00, 'marketing', false),
('expense', 8, '2024-03', 500.00, 'maintenance', false),
('expense', 9, '2024-03', 1500.00, 'professional_services', false);

-- Personnel projections (aggregated by month, reference_id is null)
INSERT INTO budget_projections (projection_type, reference_id, month, amount, category, is_projected) VALUES
('personnel', NULL, '2024-01', 14875.00, NULL, false),
('personnel', NULL, '2024-02', 14875.00, NULL, false),
('personnel', NULL, '2024-03', 14875.00, NULL, false);

-- Leasing projections
INSERT INTO budget_projections (projection_type, reference_id, month, amount, category, is_projected) VALUES
('leasing', 1, '2024-01', 800.00, NULL, false),
('leasing', 2, '2024-01', 1200.00, NULL, false),
('leasing', 3, '2024-01', 1500.00, NULL, false),
('leasing', 1, '2024-02', 800.00, NULL, false),
('leasing', 2, '2024-02', 1200.00, NULL, false),
('leasing', 3, '2024-02', 1500.00, NULL, false),
('leasing', 1, '2024-03', 800.00, NULL, false),
('leasing', 2, '2024-03', 1200.00, NULL, false),
('leasing', 3, '2024-03', 1500.00, NULL, false);

-- Future projections (April-December 2024)
-- April 2024
INSERT INTO budget_projections (projection_type, reference_id, month, amount, category, is_projected) VALUES
('expense', 1, '2024-04', 5000.00, 'rent', false),
('expense', 2, '2024-04', 800.00, 'utilities', false),
('expense', 3, '2024-04', 200.00, 'utilities', false),
('expense', 4, '2024-04', 150.00, 'utilities', false),
('expense', 5, '2024-04', 1200.00, 'supplies', false),
('expense', 8, '2024-04', 500.00, 'maintenance', false),
('expense', 10, '2024-04', 1200.00, 'supplies', false),
('expense', 11, '2024-04', 250.00, 'supplies', false),
('expense', 12, '2024-04', 150.00, 'supplies', false),
('expense', 14, '2024-04', 800.00, 'marketing', false),
('expense', 15, '2024-04', 500.00, 'marketing', false),
('expense', 17, '2024-04', 200.00, 'insurance', false),
('expense', 18, '2024-04', 500.00, 'maintenance', false),
('expense', 19, '2024-04', 300.00, 'maintenance', false),
('expense', 21, '2024-04', 1200.00, 'professional_services', false),
('expense', 22, '2024-04', 1000.00, 'professional_services', false),
('personnel', NULL, '2024-04', 18500.00, NULL, false),
('leasing', 1, '2024-04', 800.00, NULL, false),
('leasing', 2, '2024-04', 1200.00, NULL, false),
('leasing', 3, '2024-04', 1500.00, NULL, false),
('leasing', 4, '2024-04', 900.00, NULL, false),
('leasing', 5, '2024-04', 400.00, NULL, false),
('leasing', 6, '2024-04', 300.00, NULL, false),
-- May 2024
('expense', 1, '2024-05', 5000.00, 'rent', false),
('expense', 2, '2024-05', 800.00, 'utilities', false),
('expense', 3, '2024-05', 200.00, 'utilities', false),
('expense', 4, '2024-05', 150.00, 'utilities', false),
('expense', 5, '2024-05', 1200.00, 'supplies', false),
('expense', 8, '2024-05', 500.00, 'maintenance', false),
('expense', 10, '2024-05', 1200.00, 'supplies', false),
('expense', 11, '2024-05', 250.00, 'supplies', false),
('expense', 12, '2024-05', 150.00, 'supplies', false),
('expense', 14, '2024-05', 800.00, 'marketing', false),
('expense', 15, '2024-05', 500.00, 'marketing', false),
('expense', 17, '2024-05', 200.00, 'insurance', false),
('expense', 18, '2024-05', 500.00, 'maintenance', false),
('expense', 19, '2024-05', 300.00, 'maintenance', false),
('expense', 21, '2024-05', 1200.00, 'professional_services', false),
('expense', 22, '2024-05', 1000.00, 'professional_services', false),
('personnel', NULL, '2024-05', 18500.00, NULL, false),
('leasing', 1, '2024-05', 800.00, NULL, false),
('leasing', 2, '2024-05', 1200.00, NULL, false),
('leasing', 3, '2024-05', 1500.00, NULL, false),
('leasing', 4, '2024-05', 900.00, NULL, false),
('leasing', 5, '2024-05', 400.00, NULL, false),
('leasing', 6, '2024-05', 300.00, NULL, false),
-- June 2024
('expense', 1, '2024-06', 5000.00, 'rent', false),
('expense', 2, '2024-06', 800.00, 'utilities', false),
('expense', 3, '2024-06', 200.00, 'utilities', false),
('expense', 4, '2024-06', 150.00, 'utilities', false),
('expense', 5, '2024-06', 1200.00, 'supplies', false),
('expense', 6, '2024-06', 2000.00, 'marketing', false),
('expense', 8, '2024-06', 500.00, 'maintenance', false),
('expense', 10, '2024-06', 1200.00, 'supplies', false),
('expense', 11, '2024-06', 250.00, 'supplies', false),
('expense', 12, '2024-06', 150.00, 'supplies', false),
('expense', 14, '2024-06', 800.00, 'marketing', false),
('expense', 15, '2024-06', 500.00, 'marketing', false),
('expense', 17, '2024-06', 200.00, 'insurance', false),
('expense', 18, '2024-06', 500.00, 'maintenance', false),
('expense', 19, '2024-06', 300.00, 'maintenance', false),
('expense', 20, '2024-06', 200.00, 'maintenance', false),
('expense', 21, '2024-06', 1200.00, 'professional_services', false),
('expense', 22, '2024-06', 1000.00, 'professional_services', false),
('personnel', NULL, '2024-06', 18500.00, NULL, false),
('leasing', 1, '2024-06', 800.00, NULL, false),
('leasing', 2, '2024-06', 1200.00, NULL, false),
('leasing', 3, '2024-06', 1500.00, NULL, false),
('leasing', 4, '2024-06', 900.00, NULL, false),
('leasing', 5, '2024-06', 400.00, NULL, false),
('leasing', 6, '2024-06', 300.00, NULL, false),
('leasing', 7, '2024-06', 750.00, NULL, false),
-- July-December 2024 (projected)
('expense', 1, '2024-07', 5000.00, 'rent', true),
('expense', 1, '2024-08', 5000.00, 'rent', true),
('expense', 1, '2024-09', 5000.00, 'rent', true),
('expense', 1, '2024-10', 5000.00, 'rent', true),
('expense', 1, '2024-11', 5000.00, 'rent', true),
('expense', 1, '2024-12', 5000.00, 'rent', true),
('personnel', NULL, '2024-07', 18500.00, NULL, true),
('personnel', NULL, '2024-08', 18500.00, NULL, true),
('personnel', NULL, '2024-09', 18500.00, NULL, true),
('personnel', NULL, '2024-10', 18500.00, NULL, true),
('personnel', NULL, '2024-11', 18500.00, NULL, true),
('personnel', NULL, '2024-12', 18500.00, NULL, true),
('leasing', 1, '2024-07', 800.00, NULL, true),
('leasing', 1, '2024-08', 800.00, NULL, true),
('leasing', 1, '2024-09', 800.00, NULL, true),
('leasing', 1, '2024-10', 800.00, NULL, true),
('leasing', 1, '2024-11', 800.00, NULL, true),
('leasing', 1, '2024-12', 800.00, NULL, true),
('leasing', 2, '2024-07', 1200.00, NULL, true),
('leasing', 2, '2024-08', 1200.00, NULL, true),
('leasing', 2, '2024-09', 1200.00, NULL, true),
('leasing', 2, '2024-10', 1200.00, NULL, true),
('leasing', 2, '2024-11', 1200.00, NULL, true),
('leasing', 2, '2024-12', 1200.00, NULL, true),
('leasing', 3, '2024-07', 1500.00, NULL, true),
('leasing', 3, '2024-08', 1500.00, NULL, true),
('leasing', 3, '2024-09', 1500.00, NULL, true),
('leasing', 3, '2024-10', 1500.00, NULL, true),
('leasing', 3, '2024-11', 1500.00, NULL, true),
('leasing', 3, '2024-12', 1500.00, NULL, true);

-- ============================================================================
-- NOTES
-- ============================================================================
-- This seed data provides:
-- - 26 expenses (various categories and recurrence patterns)
-- - 7 leasing payments (operating and finance leases)
-- - 3 loans (different amounts and terms)
-- - 6 variables (taxes, inflation, exchange rates)
-- - 21 personnel records (various types and positions)
-- - 180 sales records (31 for Jan, 29 for Feb, 31 for Mar, 30 for Apr, 31 for May, 30 for Jun 2024)
-- - 14 investments (equipment, vehicles, renovations, technology)
-- - 31 loan schedule entries (for the 3 loans, covering 12 months)
-- - 60+ depreciation entries (for all 14 investments, covering 6 months)
-- - 150+ budget projections (expenses, personnel, leasing for Jan-Dec 2024)
-- - 12 months of cash flow, working capital, P&L, balance sheet, and financial plan data
--
-- All dates are set to 2024 for consistency
-- All amounts are in Tunisian Dinars (TND)
-- Budget projections include both actual (is_projected=false) and projected (is_projected=true) data
-- Loan schedules show payment history and future payments
-- Depreciation entries track monthly depreciation for investments

