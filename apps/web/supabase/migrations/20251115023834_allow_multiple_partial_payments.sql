-- Allow Multiple Partial Payments
-- Remove unique constraint to allow multiple partial payments for the same schedule entry

-- Drop the unique constraint that prevents multiple payments
ALTER TABLE actual_payments 
  DROP CONSTRAINT IF EXISTS actual_payments_payment_type_reference_id_schedule_entry_id_month_key;

-- Add payment_number to track multiple payments for the same entry (optional, for display purposes)
ALTER TABLE actual_payments 
  ADD COLUMN IF NOT EXISTS payment_number INTEGER DEFAULT 1;

-- Add index for querying payments by schedule entry
CREATE INDEX IF NOT EXISTS idx_actual_payments_schedule_entry ON actual_payments(schedule_entry_id) 
  WHERE schedule_entry_id IS NOT NULL;

-- Add index for querying payments by timeline entry (for leasing/expenses)
CREATE INDEX IF NOT EXISTS idx_actual_payments_timeline_entry ON actual_payments(payment_type, reference_id, month);

-- Add index for querying all payments for a specific schedule entry
CREATE INDEX IF NOT EXISTS idx_actual_payments_entry_lookup ON actual_payments(payment_type, reference_id, schedule_entry_id, month);

