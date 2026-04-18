-- Personnel hourly contractor hours:
--   1) Extend salary_frequency to allow 'hourly'
--   2) Seed 'hourly' option in SalaryFrequency metadata enum
--   3) Create personnel_hour_entries table to track hours worked per period
--      with tax variable selection, amount breakdown and optional link to a
--      generated expense row when marked paid.

ALTER TABLE personnel DROP CONSTRAINT IF EXISTS personnel_salary_frequency_check;
ALTER TABLE personnel
  ADD CONSTRAINT personnel_salary_frequency_check
  CHECK (salary_frequency IN ('yearly', 'monthly', 'weekly', 'hourly'));

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, 'hourly', 'Hourly', 'Hourly rate', 4, true
FROM metadata_enums e
WHERE e.name = 'SalaryFrequency'
ON CONFLICT (enum_id, name) DO NOTHING;

CREATE TABLE IF NOT EXISTS personnel_hour_entries (
  id BIGSERIAL PRIMARY KEY,
  personnel_id BIGINT NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_worked DECIMAL(10,2) NOT NULL CHECK (hours_worked >= 0),
  hourly_rate DECIMAL(15,2) NOT NULL CHECK (hourly_rate >= 0),
  tax_variable_id BIGINT REFERENCES variables(id) ON DELETE SET NULL,
  tax_rate_percent DECIMAL(7,4) NOT NULL DEFAULT 0,
  amount_gross DECIMAL(15,2) NOT NULL,
  amount_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_net DECIMAL(15,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  expense_id BIGINT REFERENCES expenses(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personnel_hour_entries_personnel_id ON personnel_hour_entries(personnel_id);
CREATE INDEX IF NOT EXISTS idx_personnel_hour_entries_start_date ON personnel_hour_entries(start_date);
CREATE INDEX IF NOT EXISTS idx_personnel_hour_entries_is_paid ON personnel_hour_entries(is_paid);
CREATE INDEX IF NOT EXISTS idx_personnel_hour_entries_expense_id ON personnel_hour_entries(expense_id);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'personnel_hour_entries'
        AND t.tgname = 'update_personnel_hour_entries_updated_at'
    ) THEN
      CREATE TRIGGER update_personnel_hour_entries_updated_at
        BEFORE UPDATE ON personnel_hour_entries
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;
