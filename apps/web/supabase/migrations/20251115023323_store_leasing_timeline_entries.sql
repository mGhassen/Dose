-- Store Leasing Timeline Entries
-- Instead of calculating on the fly, store all leasing payment timeline entries

CREATE TABLE IF NOT EXISTS leasing_timeline_entries (
  id BIGSERIAL PRIMARY KEY,
  leasing_id BIGINT NOT NULL REFERENCES leasing_payments(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  is_projected BOOLEAN DEFAULT true,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  actual_amount DECIMAL(15,2), -- If different from projected amount
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(leasing_id, month, payment_date)
);

CREATE INDEX idx_leasing_timeline_leasing_id ON leasing_timeline_entries(leasing_id);
CREATE INDEX idx_leasing_timeline_month ON leasing_timeline_entries(month);
CREATE INDEX idx_leasing_timeline_payment_date ON leasing_timeline_entries(payment_date);
CREATE INDEX idx_leasing_timeline_is_projected ON leasing_timeline_entries(is_projected);
CREATE INDEX idx_leasing_timeline_is_paid ON leasing_timeline_entries(is_paid);

CREATE TRIGGER update_leasing_timeline_entries_updated_at BEFORE UPDATE ON leasing_timeline_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

