-- Unified bank transaction reconciliation via allocations table.
-- Replaces inline (reconciled_entity_type, reconciled_entity_id) on bank_transactions
-- and the per-entity bank_transaction_id FKs on payments/balance_movements.
--
-- A single bank transaction can be split across multiple target entities (balance
-- movements, expenses, sales, ledger entries, or payment slices). The trigger
-- enforces per-row sign + no-overshoot; "fully reconciled" is derived at query
-- time as ABS(SUM(alloc) - bank_tx.amount) < 0.005.

CREATE TABLE IF NOT EXISTS bank_transaction_allocations (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  bank_transaction_id BIGINT NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN
    ('payment','balance_movement','expense','sale','entry')),
  entity_id BIGINT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  label TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX idx_bank_transaction_allocations_bank_tx
  ON bank_transaction_allocations(bank_transaction_id);
CREATE INDEX idx_bank_transaction_allocations_entity
  ON bank_transaction_allocations(entity_type, entity_id);
CREATE INDEX idx_bank_transaction_allocations_account
  ON bank_transaction_allocations(account_id);

ALTER TABLE bank_transaction_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bank transaction allocations"
  ON bank_transaction_allocations FOR ALL
  USING (account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()));

CREATE TRIGGER update_bank_transaction_allocations_updated_at
  BEFORE UPDATE ON bank_transaction_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Overshoot + sign check. Partial allocations are allowed; the UI enforces
-- exact match (remaining == 0) before committing a split. The DB only prevents
-- bogus states: wrong sign vs bank_tx, or total allocations exceeding |amount|.
CREATE OR REPLACE FUNCTION check_bank_tx_allocations_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_bank_tx_id BIGINT;
  v_bank_amount DECIMAL(15,2);
  v_alloc_sum DECIMAL(15,2);
  v_row RECORD;
BEGIN
  v_bank_tx_id := COALESCE(NEW.bank_transaction_id, OLD.bank_transaction_id);

  SELECT amount INTO v_bank_amount FROM bank_transactions WHERE id = v_bank_tx_id;
  IF v_bank_amount IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') AND NEW.amount IS NOT NULL THEN
    IF SIGN(NEW.amount) <> 0 AND SIGN(v_bank_amount) <> 0
       AND SIGN(NEW.amount) <> SIGN(v_bank_amount) THEN
      RAISE EXCEPTION 'Allocation sign (%) must match bank transaction sign (%)',
        NEW.amount, v_bank_amount;
    END IF;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_alloc_sum
    FROM bank_transaction_allocations
    WHERE bank_transaction_id = v_bank_tx_id;

  IF ABS(v_alloc_sum) > ABS(v_bank_amount) + 0.005 THEN
    RAISE EXCEPTION 'Allocations (%) exceed bank transaction amount (%)',
      v_alloc_sum, v_bank_amount;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER check_bank_tx_allocations_balance
  AFTER INSERT OR UPDATE OR DELETE ON bank_transaction_allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_bank_tx_allocations_balance();

-- Delete-side sync: dropping the underlying entity must drop its allocation
-- row, otherwise the allocations table would point at a ghost id.
CREATE OR REPLACE FUNCTION drop_bank_alloc_for_payment()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM bank_transaction_allocations
    WHERE entity_type = 'payment' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drop_bank_alloc_for_payment
  AFTER DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION drop_bank_alloc_for_payment();

CREATE OR REPLACE FUNCTION drop_bank_alloc_for_balance_movement()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM bank_transaction_allocations
    WHERE entity_type = 'balance_movement' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drop_bank_alloc_for_balance_movement
  AFTER DELETE ON balance_movements
  FOR EACH ROW EXECUTE FUNCTION drop_bank_alloc_for_balance_movement();

-- Reverse direction: deleting an allocation tears down the owned entity so
-- the allocations table is the source of truth for the bank-side lifecycle.
CREATE OR REPLACE FUNCTION cascade_delete_bank_allocated_entity()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.entity_type = 'balance_movement' THEN
    DELETE FROM balance_movements WHERE id = OLD.entity_id;
  ELSIF OLD.entity_type = 'payment' THEN
    DELETE FROM payments WHERE id = OLD.entity_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_delete_bank_allocated_entity
  AFTER DELETE ON bank_transaction_allocations
  FOR EACH ROW EXECUTE FUNCTION cascade_delete_bank_allocated_entity();

-- Backfill from the three current reconciliation pathways:
-- 1) payments linked to a bank tx (debit slices)
INSERT INTO bank_transaction_allocations
  (account_id, bank_transaction_id, entity_type, entity_id, amount, notes)
SELECT bt.account_id, p.bank_transaction_id, 'payment', p.id,
       -ABS(p.amount) * CASE WHEN bt.amount < 0 THEN 1 ELSE -1 END,
       p.notes
FROM payments p
JOIN bank_transactions bt ON bt.id = p.bank_transaction_id
WHERE p.bank_transaction_id IS NOT NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- 2) balance movements linked to a bank tx (amount is already signed)
INSERT INTO bank_transaction_allocations
  (account_id, bank_transaction_id, entity_type, entity_id, amount, label, notes)
SELECT m.account_id, m.bank_transaction_id, 'balance_movement', m.id, m.amount, m.label, m.notes
FROM balance_movements m
WHERE m.bank_transaction_id IS NOT NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- 3) inline reconciliation on bank_transactions for kinds that don't already
-- have a per-entity FK (expense, sale, entry). Full-amount single allocation.
INSERT INTO bank_transaction_allocations
  (account_id, bank_transaction_id, entity_type, entity_id, amount)
SELECT bt.account_id, bt.id, bt.reconciled_entity_type, bt.reconciled_entity_id, bt.amount
FROM bank_transactions bt
WHERE bt.reconciled_entity_type IN ('expense','sale','entry')
  AND bt.reconciled_entity_id IS NOT NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- Drop now-redundant columns + indexes.
DROP INDEX IF EXISTS idx_bank_transactions_reconciled;
ALTER TABLE bank_transactions
  DROP COLUMN IF EXISTS reconciled_entity_type,
  DROP COLUMN IF EXISTS reconciled_entity_id;

DROP INDEX IF EXISTS idx_payments_bank_transaction_id;
ALTER TABLE payments DROP COLUMN IF EXISTS bank_transaction_id;

DROP INDEX IF EXISTS idx_balance_movements_bank_transaction;
ALTER TABLE balance_movements DROP COLUMN IF EXISTS bank_transaction_id;
