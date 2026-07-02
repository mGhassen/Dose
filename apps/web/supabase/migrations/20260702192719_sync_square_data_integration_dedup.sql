-- Denormalize integration_id for faster process-time lookups. No cross-job staging uniqueness:
-- multiple jobs may stage the same source_id; dedup happens at process via integration_entity_mapping.

ALTER TABLE sync_square_data
  ADD COLUMN IF NOT EXISTS integration_id BIGINT REFERENCES integrations(id) ON DELETE CASCADE;

UPDATE sync_square_data s
SET integration_id = j.integration_id
FROM sync_jobs j
WHERE j.id = s.job_id AND s.integration_id IS NULL;

ALTER TABLE sync_square_data
  ALTER COLUMN integration_id SET NOT NULL;

ALTER TABLE sync_square_data
  ADD COLUMN IF NOT EXISTS skip_reason VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_sync_square_data_integration_type_source
  ON sync_square_data (integration_id, data_type, source_id)
  WHERE source_id != '';

CREATE INDEX IF NOT EXISTS idx_sync_square_data_integration_unprocessed
  ON sync_square_data (integration_id, data_type, source_id)
  WHERE processed_at IS NULL AND source_id != '';

CREATE OR REPLACE FUNCTION claim_sync_square_staging_chunk(p_job_id bigint, p_limit int)
RETURNS TABLE(id bigint, data_type varchar, source_id varchar, payload jsonb)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT sq.id
    FROM sync_square_data sq
    WHERE sq.job_id = p_job_id
      AND sq.processed_at IS NULL
    ORDER BY sq.id
    LIMIT p_limit
    FOR UPDATE OF sq SKIP LOCKED
  )
  SELECT s.id, s.data_type, s.source_id, s.payload
  FROM sync_square_data s
  INNER JOIN picked ON picked.id = s.id;
END;
$$;
