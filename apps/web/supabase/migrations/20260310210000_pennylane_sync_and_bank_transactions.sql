-- Pennylane: staging table and bank_transactions for imported bank statement lines

CREATE TABLE IF NOT EXISTS sync_pennylane_data (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL DEFAULT '',
  payload JSONB NOT NULL
);
CREATE INDEX idx_sync_pennylane_data_job ON sync_pennylane_data(job_id);
CREATE INDEX idx_sync_pennylane_data_job_type ON sync_pennylane_data(job_id, data_type);
ALTER TABLE sync_pennylane_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sync pennylane data"
  ON sync_pennylane_data FOR ALL
  USING (job_id IN (SELECT id FROM sync_jobs WHERE integration_id IN (SELECT id FROM integrations WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))))
  WITH CHECK (job_id IN (SELECT id FROM sync_jobs WHERE integration_id IN (SELECT id FROM integrations WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_id BIGINT REFERENCES integrations(id) ON DELETE SET NULL,
  source_id VARCHAR(255) NOT NULL,
  bank_account_id VARCHAR(255),
  execution_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  label TEXT,
  source VARCHAR(100),
  counterparty_name VARCHAR(255),
  counterparty_id VARCHAR(255),
  balance_after DECIMAL(15,2),
  state VARCHAR(50),
  reconciled_entity_type VARCHAR(50),
  reconciled_entity_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(integration_id, source_id)
);
CREATE INDEX idx_bank_transactions_account ON bank_transactions(account_id);
CREATE INDEX idx_bank_transactions_integration ON bank_transactions(integration_id);
CREATE INDEX idx_bank_transactions_execution_date ON bank_transactions(execution_date);
CREATE INDEX idx_bank_transactions_reconciled ON bank_transactions(reconciled_entity_type, reconciled_entity_id);
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bank transactions"
  ON bank_transactions FOR ALL
  USING (account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()));

CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
