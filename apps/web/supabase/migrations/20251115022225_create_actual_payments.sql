-- Create table to store actual payments that override projections
-- This allows tracking real payments vs projected payments for loans, leasing, and expenses

CREATE TABLE IF NOT EXISTS actual_payments (
  id BIGSERIAL PRIMARY KEY,
  payment_type VARCHAR(50) NOT NULL, -- 'loan', 'leasing', 'expense'
  reference_id BIGINT NOT NULL, -- ID of the loan/leasing/expense
  schedule_entry_id BIGINT, -- ID of the schedule entry (for loans/depreciation)
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(payment_type, reference_id, schedule_entry_id, month)
);

CREATE INDEX idx_actual_payments_type_reference ON actual_payments(payment_type, reference_id);
CREATE INDEX idx_actual_payments_month ON actual_payments(month);
CREATE INDEX idx_actual_payments_payment_date ON actual_payments(payment_date);

-- For leasing timeline entries (calculated, not stored in schedule)
-- We'll use schedule_entry_id = NULL and reference the leasing payment directly
CREATE INDEX idx_actual_payments_leasing ON actual_payments(payment_type, reference_id, month) 
  WHERE payment_type = 'leasing' AND schedule_entry_id IS NULL;

CREATE TRIGGER update_actual_payments_updated_at BEFORE UPDATE ON actual_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

