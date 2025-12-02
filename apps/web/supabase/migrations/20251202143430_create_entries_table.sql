-- Create Entries Table
-- Entries represent inputs (money coming in) or outputs (money going out)
-- An entry can have zero or more payments linked to it

CREATE TABLE IF NOT EXISTS entries (
  id BIGSERIAL PRIMARY KEY,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('input', 'output')),
  entry_type VARCHAR(50) NOT NULL, -- 'sale', 'expense', 'subscription', 'loan', 'loan_payment', 'leasing', 'leasing_payment', etc.
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL, -- Expected/planned amount
  description TEXT,
  category VARCHAR(50),
  vendor VARCHAR(255),
  entry_date DATE NOT NULL, -- Date when the entry was created/occurred
  due_date DATE, -- Optional due date for the entry
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type VARCHAR(20), -- 'monthly', 'yearly', etc. (if recurring)
  reference_id BIGINT, -- Optional reference to original entity (sale_id, expense_id, loan_id, etc.)
  schedule_entry_id BIGINT, -- For loan/leasing schedule entries (loan_schedule.id or leasing_timeline_entry.id)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_entries_direction ON entries(direction);
CREATE INDEX idx_entries_entry_type ON entries(entry_type);
CREATE INDEX idx_entries_entry_date ON entries(entry_date);
CREATE INDEX idx_entries_due_date ON entries(due_date);
CREATE INDEX idx_entries_reference_id ON entries(reference_id);
CREATE INDEX idx_entries_schedule_entry_id ON entries(schedule_entry_id);
CREATE INDEX idx_entries_is_active ON entries(is_active);
CREATE INDEX idx_entries_direction_type ON entries(direction, entry_type);

CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

