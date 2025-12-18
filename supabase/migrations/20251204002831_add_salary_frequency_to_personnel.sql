-- Add salary frequency to personnel table
-- This indicates whether the base_salary is yearly, monthly, or weekly

ALTER TABLE personnel 
ADD COLUMN IF NOT EXISTS salary_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (salary_frequency IN ('yearly', 'monthly', 'weekly'));

-- Update existing records to default to monthly
UPDATE personnel SET salary_frequency = 'monthly' WHERE salary_frequency IS NULL;

CREATE INDEX IF NOT EXISTS idx_personnel_salary_frequency ON personnel(salary_frequency);



