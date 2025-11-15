-- Budgets Table
-- Stores budget definitions (name, fiscal year, period, etc.)

CREATE TABLE budgets (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  fiscal_year_start VARCHAR(7) NOT NULL, -- YYYY-MM format
  budget_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
  reporting_tag_id BIGINT, -- Optional reference to reporting tag
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, fiscal_year_start)
);

CREATE INDEX idx_budgets_fiscal_year ON budgets(fiscal_year_start);
CREATE INDEX idx_budgets_name ON budgets(name);

-- Budget Accounts Table
-- Stores the hierarchical account structure for budgets

CREATE TABLE budget_accounts (
  id BIGSERIAL PRIMARY KEY,
  budget_id BIGINT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_path VARCHAR(500) NOT NULL, -- Hierarchical path like "Profit and Loss/Income/Income/New subscription"
  account_label VARCHAR(255) NOT NULL, -- Display label like "New subscription"
  account_type VARCHAR(50) NOT NULL, -- 'income', 'expense', 'asset', 'liability', 'equity'
  level INTEGER NOT NULL DEFAULT 0, -- Hierarchy level (0 = root)
  parent_path VARCHAR(500), -- Parent account path for hierarchy
  is_group BOOLEAN DEFAULT false, -- If true, this is a group header (not a data entry)
  display_order INTEGER DEFAULT 0, -- Order for display
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(budget_id, account_path)
);

CREATE INDEX idx_budget_accounts_budget_id ON budget_accounts(budget_id);
CREATE INDEX idx_budget_accounts_account_path ON budget_accounts(account_path);
CREATE INDEX idx_budget_accounts_parent_path ON budget_accounts(parent_path);

-- Budget Entries Table
-- Stores actual budget values for each account and month

CREATE TABLE budget_entries (
  id BIGSERIAL PRIMARY KEY,
  budget_id BIGINT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_path VARCHAR(500) NOT NULL, -- References budget_accounts.account_path
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(budget_id, account_path, month)
);

CREATE INDEX idx_budget_entries_budget_id ON budget_entries(budget_id);
CREATE INDEX idx_budget_entries_account_path ON budget_entries(account_path);
CREATE INDEX idx_budget_entries_month ON budget_entries(month);
CREATE INDEX idx_budget_entries_budget_month ON budget_entries(budget_id, month);

-- Triggers for updated_at
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_accounts_updated_at BEFORE UPDATE ON budget_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_entries_updated_at BEFORE UPDATE ON budget_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

