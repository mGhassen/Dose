-- Integration entity mapping: tracks Square (or other) source ids to app entities
-- Used to avoid re-importing the same catalog item, order, or payment

CREATE TABLE IF NOT EXISTS integration_entity_mapping (
  id BIGSERIAL PRIMARY KEY,
  integration_id BIGINT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  app_entity_type VARCHAR(50) NOT NULL,
  app_entity_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(integration_id, source_type, source_id)
);

CREATE INDEX idx_integration_entity_mapping_integration ON integration_entity_mapping(integration_id);
CREATE INDEX idx_integration_entity_mapping_lookup ON integration_entity_mapping(integration_id, source_type, source_id);

ALTER TABLE integration_entity_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integration mappings"
  ON integration_entity_mapping FOR ALL
  USING (
    integration_id IN (
      SELECT id FROM integrations WHERE account_id IN (
        SELECT id FROM accounts WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    integration_id IN (
      SELECT id FROM integrations WHERE account_id IN (
        SELECT id FROM accounts WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Async Square sync: jobs, staging data, import errors
CREATE TABLE IF NOT EXISTS sync_jobs (
  id BIGSERIAL PRIMARY KEY,
  integration_id BIGINT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  stats JSONB DEFAULT '{}'
);
CREATE INDEX idx_sync_jobs_integration ON sync_jobs(integration_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_created ON sync_jobs(created_at DESC);
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sync jobs"
  ON sync_jobs FOR ALL
  USING (integration_id IN (SELECT id FROM integrations WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid())))
  WITH CHECK (integration_id IN (SELECT id FROM integrations WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid())));

CREATE TABLE IF NOT EXISTS sync_square_data (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL DEFAULT '',
  payload JSONB NOT NULL
);
CREATE INDEX idx_sync_square_data_job ON sync_square_data(job_id);
CREATE INDEX idx_sync_square_data_job_type ON sync_square_data(job_id, data_type);
ALTER TABLE sync_square_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sync square data"
  ON sync_square_data FOR ALL
  USING (job_id IN (SELECT id FROM sync_jobs WHERE integration_id IN (SELECT id FROM integrations WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))))
  WITH CHECK (job_id IN (SELECT id FROM sync_jobs WHERE integration_id IN (SELECT id FROM integrations WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))));

CREATE TABLE IF NOT EXISTS sync_import_errors (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL DEFAULT '',
  error_message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sync_import_errors_job ON sync_import_errors(job_id);
ALTER TABLE sync_import_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sync import errors"
  ON sync_import_errors FOR ALL
  USING (job_id IN (SELECT id FROM sync_jobs WHERE integration_id IN (SELECT id FROM integrations WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))))
  WITH CHECK (job_id IN (SELECT id FROM sync_jobs WHERE integration_id IN (SELECT id FROM integrations WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid()))));
