-- Add off_payment_months and first_payment_amount columns to leasing_payments table
-- off_payment_months: Array of month numbers (1, 2, 3...) where no payment is made
-- first_payment_amount: Optional different amount for the first payment

ALTER TABLE leasing_payments 
ADD COLUMN IF NOT EXISTS off_payment_months INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS first_payment_amount DECIMAL(15,2);

COMMENT ON COLUMN leasing_payments.off_payment_months IS 'Array of month numbers (from start date) where no payment is made';
COMMENT ON COLUMN leasing_payments.first_payment_amount IS 'Optional different amount for the first payment (if null, uses regular amount)';



