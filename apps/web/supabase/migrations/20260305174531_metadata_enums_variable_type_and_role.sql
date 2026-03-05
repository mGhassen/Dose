-- Add missing VariableType values (transaction_tax, unit) and Role enum for app-wide metadata enum usage

-- ============================================================================
-- VARIABLE TYPE: add transaction_tax and unit
-- ============================================================================
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
  ('transaction_tax', 'Transaction Tax', 'Transaction/sales tax rates', 6),
  ('unit', 'Unit', 'Unit of measure', 7)
) AS v(name, label, description, display_order)
WHERE e.name = 'VariableType'
ON CONFLICT (enum_id, name) DO NOTHING;

-- ============================================================================
-- ROLE: move from hardcoded API to metadata_enums
-- ============================================================================
INSERT INTO metadata_enums (name, label, description, is_active) VALUES
('Role', 'Role', 'User roles', true)
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
  ('member', 'Member', 'Member role', 1),
  ('manager', 'Manager', 'Manager role', 2),
  ('administrator', 'Administrator', 'Administrator role', 3)
) AS v(name, label, description, display_order)
WHERE e.name = 'Role'
ON CONFLICT (enum_id, name) DO NOTHING;
