-- Create Payments Table
-- Payments are linked to entries and represent actual money transactions
-- An entry can have zero or more payments (e.g., subscription with multiple payments)

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  entry_id BIGINT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  payment_method VARCHAR(50), -- 'cash', 'card', 'bank_transfer', etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_entry_id ON payments(entry_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_is_paid ON payments(is_paid);
CREATE INDEX idx_payments_paid_date ON payments(paid_date);

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



