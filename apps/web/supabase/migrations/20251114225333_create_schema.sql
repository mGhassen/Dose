-- SunnyBudget Database Schema
-- Creates all tables for the financial tracking application

-- ============================================================================
-- EXPENSES
-- ============================================================================
CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  recurrence VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  vendor VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_start_date ON expenses(start_date);
CREATE INDEX idx_expenses_is_active ON expenses(is_active);

-- ============================================================================
-- LEASING PAYMENTS
-- ============================================================================
CREATE TABLE leasing_payments (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  frequency VARCHAR(20) NOT NULL,
  description TEXT,
  lessor VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leasing_start_date ON leasing_payments(start_date);
CREATE INDEX idx_leasing_is_active ON leasing_payments(is_active);

-- ============================================================================
-- LOANS
-- ============================================================================
CREATE TABLE loans (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  loan_number VARCHAR(50) NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  lender VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_start_date ON loans(start_date);

-- ============================================================================
-- LOAN SCHEDULES
-- ============================================================================
CREATE TABLE loan_schedules (
  id BIGSERIAL PRIMARY KEY,
  loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  principal_payment DECIMAL(15,2) NOT NULL,
  interest_payment DECIMAL(15,2) NOT NULL,
  total_payment DECIMAL(15,2) NOT NULL,
  remaining_balance DECIMAL(15,2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  UNIQUE(loan_id, month)
);

CREATE INDEX idx_loan_schedules_loan_id ON loan_schedules(loan_id);
CREATE INDEX idx_loan_schedules_payment_date ON loan_schedules(payment_date);

-- ============================================================================
-- VARIABLES
-- ============================================================================
CREATE TABLE variables (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  unit VARCHAR(50),
  effective_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variables_type ON variables(type);
CREATE INDEX idx_variables_effective_date ON variables(effective_date);
CREATE INDEX idx_variables_is_active ON variables(is_active);

-- ============================================================================
-- PERSONNEL
-- ============================================================================
CREATE TABLE personnel (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  position VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  base_salary DECIMAL(15,2) NOT NULL,
  employer_charges DECIMAL(15,2) NOT NULL,
  employer_charges_type VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_personnel_type ON personnel(type);
CREATE INDEX idx_personnel_start_date ON personnel(start_date);
CREATE INDEX idx_personnel_is_active ON personnel(is_active);

-- ============================================================================
-- SALES
-- ============================================================================
CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  quantity INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_type ON sales(type);

-- ============================================================================
-- INVESTMENTS
-- ============================================================================
CREATE TABLE investments (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  purchase_date DATE NOT NULL,
  useful_life_months INTEGER NOT NULL,
  depreciation_method VARCHAR(50) NOT NULL,
  residual_value DECIMAL(15,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_investments_type ON investments(type);
CREATE INDEX idx_investments_purchase_date ON investments(purchase_date);

-- ============================================================================
-- DEPRECIATION ENTRIES
-- ============================================================================
CREATE TABLE depreciation_entries (
  id BIGSERIAL PRIMARY KEY,
  investment_id BIGINT NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  depreciation_amount DECIMAL(15,2) NOT NULL,
  accumulated_depreciation DECIMAL(15,2) NOT NULL,
  book_value DECIMAL(15,2) NOT NULL,
  UNIQUE(investment_id, month)
);

CREATE INDEX idx_depreciation_investment_id ON depreciation_entries(investment_id);
CREATE INDEX idx_depreciation_month ON depreciation_entries(month);

-- ============================================================================
-- CASH FLOW
-- ============================================================================
CREATE TABLE cash_flow (
  id BIGSERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  opening_balance DECIMAL(15,2) NOT NULL,
  cash_inflows DECIMAL(15,2) NOT NULL,
  cash_outflows DECIMAL(15,2) NOT NULL,
  net_cash_flow DECIMAL(15,2) NOT NULL,
  closing_balance DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(month)
);

CREATE INDEX idx_cash_flow_month ON cash_flow(month);

-- ============================================================================
-- WORKING CAPITAL
-- ============================================================================
CREATE TABLE working_capital (
  id BIGSERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  accounts_receivable DECIMAL(15,2) NOT NULL,
  inventory DECIMAL(15,2) NOT NULL,
  accounts_payable DECIMAL(15,2) NOT NULL,
  other_current_assets DECIMAL(15,2) NOT NULL,
  other_current_liabilities DECIMAL(15,2) NOT NULL,
  working_capital_need DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(month)
);

CREATE INDEX idx_working_capital_month ON working_capital(month);

-- ============================================================================
-- PROFIT AND LOSS
-- ============================================================================
CREATE TABLE profit_and_loss (
  id BIGSERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  total_revenue DECIMAL(15,2) NOT NULL,
  cost_of_goods_sold DECIMAL(15,2) NOT NULL,
  operating_expenses DECIMAL(15,2) NOT NULL,
  personnel_costs DECIMAL(15,2) NOT NULL,
  leasing_costs DECIMAL(15,2) NOT NULL,
  depreciation DECIMAL(15,2) NOT NULL,
  interest_expense DECIMAL(15,2) NOT NULL,
  taxes DECIMAL(15,2) NOT NULL,
  other_expenses DECIMAL(15,2) NOT NULL,
  gross_profit DECIMAL(15,2) NOT NULL,
  operating_profit DECIMAL(15,2) NOT NULL,
  net_profit DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(month)
);

CREATE INDEX idx_profit_loss_month ON profit_and_loss(month);

-- ============================================================================
-- BALANCE SHEET
-- ============================================================================
CREATE TABLE balance_sheet (
  id BIGSERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  current_assets DECIMAL(15,2) NOT NULL,
  fixed_assets DECIMAL(15,2) NOT NULL,
  intangible_assets DECIMAL(15,2) NOT NULL,
  total_assets DECIMAL(15,2) NOT NULL,
  current_liabilities DECIMAL(15,2) NOT NULL,
  long_term_debt DECIMAL(15,2) NOT NULL,
  total_liabilities DECIMAL(15,2) NOT NULL,
  share_capital DECIMAL(15,2) NOT NULL,
  retained_earnings DECIMAL(15,2) NOT NULL,
  total_equity DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(month)
);

CREATE INDEX idx_balance_sheet_month ON balance_sheet(month);

-- ============================================================================
-- FINANCIAL PLAN
-- ============================================================================
CREATE TABLE financial_plan (
  id BIGSERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  equity DECIMAL(15,2) NOT NULL,
  loans DECIMAL(15,2) NOT NULL,
  other_sources DECIMAL(15,2) NOT NULL,
  total_sources DECIMAL(15,2) NOT NULL,
  investments DECIMAL(15,2) NOT NULL,
  working_capital DECIMAL(15,2) NOT NULL,
  loan_repayments DECIMAL(15,2) NOT NULL,
  other_uses DECIMAL(15,2) NOT NULL,
  total_uses DECIMAL(15,2) NOT NULL,
  net_financing DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(month)
);

CREATE INDEX idx_financial_plan_month ON financial_plan(month);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leasing_payments_updated_at BEFORE UPDATE ON leasing_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_variables_updated_at BEFORE UPDATE ON variables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_flow_updated_at BEFORE UPDATE ON cash_flow
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_capital_updated_at BEFORE UPDATE ON working_capital
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profit_and_loss_updated_at BEFORE UPDATE ON profit_and_loss
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balance_sheet_updated_at BEFORE UPDATE ON balance_sheet
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_plan_updated_at BEFORE UPDATE ON financial_plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

