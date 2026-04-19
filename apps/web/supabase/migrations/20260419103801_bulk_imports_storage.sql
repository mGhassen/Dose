-- CSV/Excel bulk data imports (csv_bulk integration): store original files in Supabase Storage

INSERT INTO storage.buckets (id, name, public)
VALUES ('bulk-imports', 'bulk-imports', false)
ON CONFLICT (id) DO NOTHING;
