-- Successor job recovery: link recovery jobs to stopped parent, track recovery intent.

ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS parent_job_id BIGINT REFERENCES sync_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recovery_action VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_parent ON sync_jobs(parent_job_id);

COMMENT ON COLUMN sync_jobs.parent_job_id IS 'Stopped parent job; successor reads staging from parent job_id';
COMMENT ON COLUMN sync_jobs.recovery_action IS 'resume_fetch | process_staged | discard_staging';
