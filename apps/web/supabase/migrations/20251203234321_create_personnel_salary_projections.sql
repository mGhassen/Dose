-- Create Personnel Salary Projections Table
-- Stores monthly salary projections for each personnel with breakdown of brute/net/taxes
-- Each month has two payment dates: net salary payment and taxes payment

-- Only create if personnel table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'personnel') THEN
    CREATE TABLE IF NOT EXISTS personnel_salary_projections (
      id BIGSERIAL PRIMARY KEY,
      personnel_id BIGINT NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
      month VARCHAR(7) NOT NULL, -- YYYY-MM
      brute_salary DECIMAL(15,2) NOT NULL, -- Gross salary before taxes
      net_salary DECIMAL(15,2) NOT NULL, -- Net salary after employee taxes
      social_taxes DECIMAL(15,2) NOT NULL DEFAULT 0, -- Employee social contributions
      employer_taxes DECIMAL(15,2) NOT NULL DEFAULT 0, -- Employer charges/taxes
      net_payment_date DATE, -- Date when net salary is paid
      taxes_payment_date DATE, -- Date when taxes are paid
      is_projected BOOLEAN DEFAULT true,
      is_net_paid BOOLEAN DEFAULT false, -- Whether net salary payment is completed
      is_taxes_paid BOOLEAN DEFAULT false, -- Whether taxes payment is completed
      net_paid_date DATE, -- Actual date net salary was paid
      taxes_paid_date DATE, -- Actual date taxes were paid
      actual_net_amount DECIMAL(15,2), -- Actual net amount paid (if different from projected)
      actual_taxes_amount DECIMAL(15,2), -- Actual taxes amount paid (if different from projected)
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(personnel_id, month)
    );
  END IF;
END $$;

-- Create indexes and trigger only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'personnel_salary_projections') THEN
    CREATE INDEX IF NOT EXISTS idx_personnel_salary_projection_personnel_id ON personnel_salary_projections(personnel_id);
    CREATE INDEX IF NOT EXISTS idx_personnel_salary_projection_month ON personnel_salary_projections(month);
    CREATE INDEX IF NOT EXISTS idx_personnel_salary_projection_is_projected ON personnel_salary_projections(is_projected);
    CREATE INDEX IF NOT EXISTS idx_personnel_salary_projection_is_net_paid ON personnel_salary_projections(is_net_paid);
    CREATE INDEX IF NOT EXISTS idx_personnel_salary_projection_is_taxes_paid ON personnel_salary_projections(is_taxes_paid);
    CREATE INDEX IF NOT EXISTS idx_personnel_salary_projection_net_payment_date ON personnel_salary_projections(net_payment_date);
    CREATE INDEX IF NOT EXISTS idx_personnel_salary_projection_taxes_payment_date ON personnel_salary_projections(taxes_payment_date);

    -- Create trigger if function exists
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
      DROP TRIGGER IF EXISTS update_personnel_salary_projections_updated_at ON personnel_salary_projections;
      CREATE TRIGGER update_personnel_salary_projections_updated_at 
        BEFORE UPDATE ON personnel_salary_projections
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;

