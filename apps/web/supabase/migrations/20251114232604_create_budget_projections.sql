-- Budget Projections Table
-- Stores monthly projections for all budget items (expenses, personnel, leasing, sales)

CREATE TABLE budget_projections (
  id BIGSERIAL PRIMARY KEY,
  projection_type VARCHAR(50) NOT NULL, -- 'expense', 'personnel', 'leasing', 'sales'
  reference_id BIGINT, -- expense_id, personnel_id, leasing_id (null for sales)
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  amount DECIMAL(15,2) NOT NULL,
  category VARCHAR(50), -- For expenses
  is_projected BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(projection_type, reference_id, month)
);

CREATE INDEX idx_budget_projections_type ON budget_projections(projection_type);
CREATE INDEX idx_budget_projections_reference_id ON budget_projections(reference_id);
CREATE INDEX idx_budget_projections_month ON budget_projections(month);
CREATE INDEX idx_budget_projections_type_month ON budget_projections(projection_type, month);

CREATE TRIGGER update_budget_projections_updated_at BEFORE UPDATE ON budget_projections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

