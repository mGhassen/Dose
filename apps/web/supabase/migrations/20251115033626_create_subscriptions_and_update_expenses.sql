-- Create subscriptions table for recurring expenses
CREATE TABLE subscriptions (
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

CREATE INDEX idx_subscriptions_category ON subscriptions(category);
CREATE INDEX idx_subscriptions_start_date ON subscriptions(start_date);
CREATE INDEX idx_subscriptions_is_active ON subscriptions(is_active);
CREATE INDEX idx_subscriptions_recurrence ON subscriptions(recurrence);

-- Create subscription_projection_entries table (similar to expense_projection_entries)
CREATE TABLE subscription_projection_entries (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  amount DECIMAL(15,2) NOT NULL,
  is_projected BOOLEAN DEFAULT true,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  actual_amount DECIMAL(15,2), -- If different from projected amount
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subscription_id, month)
);

CREATE INDEX idx_subscription_projection_subscription_id ON subscription_projection_entries(subscription_id);
CREATE INDEX idx_subscription_projection_month ON subscription_projection_entries(month);
CREATE INDEX idx_subscription_projection_is_projected ON subscription_projection_entries(is_projected);
CREATE INDEX idx_subscription_projection_is_paid ON subscription_projection_entries(is_paid);

-- Add subscription_id and expense_date to expenses table
ALTER TABLE expenses ADD COLUMN subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN expense_date DATE; -- When the expense actually occurred

CREATE INDEX idx_expenses_subscription_id ON expenses(subscription_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

-- Migrate existing recurring expenses to subscriptions
-- Only migrate expenses that are not one_time
INSERT INTO subscriptions (name, category, amount, recurrence, start_date, end_date, description, vendor, is_active, created_at, updated_at)
SELECT DISTINCT ON (name, category, amount, recurrence, start_date, COALESCE(end_date, '1900-01-01'))
  name,
  category,
  amount,
  recurrence,
  start_date,
  end_date,
  description,
  vendor,
  is_active,
  created_at,
  updated_at
FROM expenses
WHERE recurrence != 'one_time'
ORDER BY name, category, amount, recurrence, start_date, COALESCE(end_date, '1900-01-01'), created_at;

-- Link expenses to their corresponding subscriptions
UPDATE expenses e
SET subscription_id = s.id
FROM subscriptions s
WHERE e.recurrence != 'one_time'
  AND e.name = s.name
  AND e.category = s.category
  AND e.amount = s.amount
  AND e.recurrence = s.recurrence
  AND e.start_date = s.start_date
  AND COALESCE(e.end_date, '1900-01-01') = COALESCE(s.end_date, '1900-01-01');

-- Set expense_date to start_date for existing expenses (migration)
UPDATE expenses SET expense_date = start_date WHERE expense_date IS NULL;

-- Migrate expense_projection_entries to subscription_projection_entries for recurring expenses
INSERT INTO subscription_projection_entries (
  subscription_id, month, amount, is_projected, is_paid, paid_date, actual_amount, notes, created_at, updated_at
)
SELECT 
  e.subscription_id,
  epe.month,
  epe.amount,
  epe.is_projected,
  epe.is_paid,
  epe.paid_date,
  epe.actual_amount,
  epe.notes,
  epe.created_at,
  epe.updated_at
FROM expense_projection_entries epe
JOIN expenses e ON epe.expense_id = e.id
WHERE e.subscription_id IS NOT NULL
ON CONFLICT (subscription_id, month) DO NOTHING;

-- Create trigger for updated_at on subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Create trigger for updated_at on subscription_projection_entries
CREATE TRIGGER update_subscription_projection_entries_updated_at 
  BEFORE UPDATE ON subscription_projection_entries
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
