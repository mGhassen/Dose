-- Optional link from payment slice to bank import; optional UUID to group sibling allocations (one logical payment, many entries).
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS bank_transaction_id BIGINT REFERENCES bank_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_payments_bank_transaction_id ON payments(bank_transaction_id)
  WHERE bank_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_payment_group_id ON payments(payment_group_id)
  WHERE payment_group_id IS NOT NULL;
