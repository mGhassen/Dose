-- Bulk import (csv_bulk): review step before apply; cron only processes when ready.

ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS bulk_review_status TEXT NOT NULL DEFAULT 'none'
    CHECK (bulk_review_status IN ('none', 'needs_review', 'ready', 'complete', 'cancelled'));

ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS bulk_review_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- In-flight csv_bulk jobs created before this column: allow cron to finish them.
UPDATE sync_jobs sj
SET bulk_review_status = 'ready'
FROM integrations i
WHERE sj.integration_id = i.id
  AND i.integration_type = 'csv_bulk'
  AND sj.status IN ('pending', 'processing');
