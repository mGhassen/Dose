-- Balance accounts: user-defined financial buckets (capital, partner accounts, cash, ...)
-- with manual movements. Bank transactions can be reconciled into a movement via the
-- existing reconciled_entity_type / reconciled_entity_id pattern (reconciled_entity_type = 'balance_movement').

CREATE TABLE IF NOT EXISTS balance_accounts (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(32) NOT NULL CHECK (kind IN ('capital', 'partner_account', 'cash', 'other')),
  currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_balance_accounts_account ON balance_accounts(account_id);
CREATE INDEX idx_balance_accounts_kind ON balance_accounts(kind);
CREATE INDEX idx_balance_accounts_archived_at ON balance_accounts(archived_at);

ALTER TABLE balance_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own balance accounts"
  ON balance_accounts FOR ALL
  USING (account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()));

CREATE TRIGGER update_balance_accounts_updated_at BEFORE UPDATE ON balance_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE IF NOT EXISTS balance_movements (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  balance_account_id BIGINT NOT NULL REFERENCES balance_accounts(id) ON DELETE CASCADE,
  occurred_on DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  label TEXT,
  notes TEXT,
  bank_transaction_id BIGINT REFERENCES bank_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_balance_movements_account ON balance_movements(account_id);
CREATE INDEX idx_balance_movements_balance_account ON balance_movements(balance_account_id, occurred_on);
CREATE INDEX idx_balance_movements_bank_transaction ON balance_movements(bank_transaction_id);

ALTER TABLE balance_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own balance movements"
  ON balance_movements FOR ALL
  USING (account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()));

CREATE TRIGGER update_balance_movements_updated_at BEFORE UPDATE ON balance_movements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
