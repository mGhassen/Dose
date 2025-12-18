-- Add total_amount field to leasing_payments
-- This allows declaring leasing by total amount instead of periodic amount

ALTER TABLE leasing_payments
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2);

COMMENT ON COLUMN leasing_payments.total_amount IS 'Total amount to pay over the lease period. If set, the periodic amount will be calculated based on this total, start date, end date, and frequency.';



