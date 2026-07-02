ALTER TABLE sync_square_data
  ADD COLUMN IF NOT EXISTS process_step_id BIGINT REFERENCES sync_job_steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sync_square_data_process_step ON sync_square_data(process_step_id);
