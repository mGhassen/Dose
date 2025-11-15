-- Add Payment Direction (Input/Output)
-- Distinguish between input payments (money coming in) and output payments (money going out)

-- Add direction column: 'input' for revenue/payments received, 'output' for expenses/payments made
ALTER TABLE actual_payments 
  ADD COLUMN IF NOT EXISTS direction VARCHAR(10) DEFAULT 'output' CHECK (direction IN ('input', 'output'));

-- Update existing payments to be 'output' (they're all expenses/loans/leasing/subscriptions)
UPDATE actual_payments SET direction = 'output' WHERE direction IS NULL;

-- Add index for querying by direction
CREATE INDEX IF NOT EXISTS idx_actual_payments_direction ON actual_payments(direction);

-- Add index for querying payments by direction and type
CREATE INDEX IF NOT EXISTS idx_actual_payments_direction_type ON actual_payments(direction, payment_type);

-- Add index for querying input payments (for sales/revenue tracking)
CREATE INDEX IF NOT EXISTS idx_actual_payments_input ON actual_payments(direction, reference_id, month) 
  WHERE direction = 'input';

-- Add index for querying output payments (for expenses/subscriptions/loans)
CREATE INDEX IF NOT EXISTS idx_actual_payments_output ON actual_payments(direction, reference_id, month) 
  WHERE direction = 'output';

