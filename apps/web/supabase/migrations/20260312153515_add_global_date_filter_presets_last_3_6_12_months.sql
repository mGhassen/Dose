INSERT INTO metadata_enum_values (enum_id, name, label, description, display_order, is_active)
SELECT e.id, v.name, v.label, v.description, v.display_order, true
FROM metadata_enums e
CROSS JOIN (VALUES
  ('last_3_months', 'Last 3 months', 'Last 3 months', 9),
  ('last_6_months', 'Last 6 months', 'Last 6 months', 10),
  ('last_12_months', 'Last 12 months', 'Last 12 months', 11)
) AS v(name, label, description, display_order)
WHERE e.name = 'GlobalDateFilterPreset'
ON CONFLICT (enum_id, name) DO NOTHING;

UPDATE metadata_enum_values ev
SET display_order = v.display_order
FROM metadata_enums e
JOIN (VALUES ('this_year', 12), ('last_year', 13), ('custom', 14)) AS v(name, display_order) ON true
WHERE ev.enum_id = e.id AND e.name = 'GlobalDateFilterPreset' AND ev.name = v.name;
