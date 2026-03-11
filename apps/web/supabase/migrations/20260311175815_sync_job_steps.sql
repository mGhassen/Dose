-- Sync job steps: per-page and per-phase progress for Square sync UI
CREATE TABLE IF NOT EXISTS sync_job_steps (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  sequence INT NOT NULL,
  name TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_job_steps_job ON sync_job_steps(job_id);
CREATE INDEX idx_sync_job_steps_job_sequence ON sync_job_steps(job_id, sequence);

ALTER TABLE sync_job_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync job steps"
  ON sync_job_steps FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM sync_jobs
      WHERE integration_id IN (
        SELECT id FROM integrations
        WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Service can insert/update sync job steps"
  ON sync_job_steps FOR ALL
  USING (
    job_id IN (
      SELECT id FROM sync_jobs
      WHERE integration_id IN (
        SELECT id FROM integrations
        WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    job_id IN (
      SELECT id FROM sync_jobs
      WHERE integration_id IN (
        SELECT id FROM integrations
        WHERE account_id IN (SELECT id FROM accounts WHERE auth_user_id = auth.uid())
      )
    )
  );
