-- Add created_at and updated_at columns to schedule tables
-- This allows tracking when schedule entries were created and last modified

-- Add to loan_schedules
ALTER TABLE loan_schedules 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TRIGGER update_loan_schedules_updated_at BEFORE UPDATE ON loan_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add to depreciation_entries
ALTER TABLE depreciation_entries 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TRIGGER update_depreciation_entries_updated_at BEFORE UPDATE ON depreciation_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

