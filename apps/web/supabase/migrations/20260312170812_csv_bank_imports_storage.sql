-- CSV/Excel bank imports: store original files in Supabase Storage

-- 1) Track original import file per sync job
ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS source_file_path TEXT;

-- 2) Private bucket for uploaded bank import files (RLS on storage.objects is managed by Supabase; API uses service role for uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-imports', 'bank-imports', false)
ON CONFLICT (id) DO NOTHING;
