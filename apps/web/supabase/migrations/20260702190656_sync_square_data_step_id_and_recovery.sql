-- Link staging rows to fetch steps; integration process lock; partially_imported job status.

ALTER TABLE sync_square_data
  ADD COLUMN IF NOT EXISTS step_id BIGINT REFERENCES sync_job_steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sync_square_data_step ON sync_square_data(step_id);

ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS sync_active_job_id BIGINT REFERENCES sync_jobs(id) ON DELETE SET NULL;

COMMENT ON COLUMN sync_jobs.status IS 'pending|staging|processing|completed|failed|cancelled|stopped|partially_imported';
