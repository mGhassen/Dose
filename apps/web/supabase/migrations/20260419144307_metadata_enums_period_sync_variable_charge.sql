-- Personnel hour period (aligns with personnel_hour_entries.period_type values; for metadata-driven validation)
INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('PersonnelHourPeriodType', 'Personnel hour period', 'Granularity for contractor hour entries', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('day', 'Day', 'Single day', 1),
  ('week', 'Week', 'Week', 2),
  ('month', 'Month', 'Month', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'PersonnelHourPeriodType'
ON CONFLICT (enum_id, name) DO NOTHING;

-- Sync window mode (integration sync API / UI; was only hardcoded in app)
INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('SyncPeriodMode', 'Sync period mode', 'How the sync time range is chosen', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT
  e.id,
  v.name,
  v.label,
  v.description,
  v.display_order,
  true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('last_sync', 'Last sync', 'Since last successful sync', 1),
  ('custom', 'Custom', 'Custom start/end', 2),
  ('all', 'All', 'Full available history', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'SyncPeriodMode'
ON CONFLICT (enum_id, name) DO NOTHING;

-- SyncType: add transactions (used by sync body / integrations; keep display_order after locations)
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT
  e.id,
  'transactions',
  'Transactions',
  'Transactions import',
  5,
  true
FROM metadata_enums e
WHERE e.name = 'SyncType'
ON CONFLICT (enum_id, name) DO NOTHING;

UPDATE metadata_enum_values ev
SET display_order = 6
FROM metadata_enums en
WHERE ev.enum_id = en.id
  AND en.name = 'SyncType'
  AND ev.name = 'full';

-- VariableType: add charge (financial variables)
INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT
  e.id,
  'charge',
  'Charge',
  'Charge variables',
  8,
  true
FROM metadata_enums e
WHERE e.name = 'VariableType'
ON CONFLICT (enum_id, name) DO NOTHING;
