-- Add off_payment_months column to loans table
-- This stores an array of month numbers (1, 2, 3...) where only interest is paid, no principal

ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS off_payment_months INTEGER[] DEFAULT '{}';

COMMENT ON COLUMN loans.off_payment_months IS 'Array of month numbers where only interest is paid (no principal payment)';

