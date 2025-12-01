-- Metadata Enums Tables
-- Stores all enum definitions and their values for the application
-- This allows dynamic management of enums like ExpenseCategory, ExpenseRecurrence, etc.

-- ============================================================================
-- METADATA_ENUMS
-- ============================================================================
-- Stores enum definitions (e.g., 'ExpenseCategory', 'ExpenseRecurrence')
CREATE TABLE metadata_enums (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metadata_enums_name ON metadata_enums(name);
CREATE INDEX idx_metadata_enums_is_active ON metadata_enums(is_active);

-- ============================================================================
-- METADATA_ENUM_VALUES
-- ============================================================================
-- Stores individual enum values (e.g., 'rent', 'utilities' for ExpenseCategory)
CREATE TABLE metadata_enum_values (
  id BIGSERIAL PRIMARY KEY,
  enum_id BIGINT NOT NULL REFERENCES metadata_enums(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  value INTEGER, -- Optional numeric value for ordering
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(enum_id, name)
);

CREATE INDEX idx_metadata_enum_values_enum_id ON metadata_enum_values(enum_id);
CREATE INDEX idx_metadata_enum_values_name ON metadata_enum_values(name);
CREATE INDEX idx_metadata_enum_values_is_active ON metadata_enum_values(is_active);
CREATE INDEX idx_metadata_enum_values_display_order ON metadata_enum_values(display_order);

-- Enable Row Level Security
ALTER TABLE metadata_enums ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_enum_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated users to read, only admins to write
CREATE POLICY "Allow authenticated users to read metadata_enums"
  ON metadata_enums FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read metadata_enum_values"
  ON metadata_enum_values FOR SELECT
  USING (auth.role() = 'authenticated');

-- For now, allow all authenticated users to write (can be restricted later)
CREATE POLICY "Allow authenticated users to insert metadata_enums"
  ON metadata_enums FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update metadata_enums"
  ON metadata_enums FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete metadata_enums"
  ON metadata_enums FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert metadata_enum_values"
  ON metadata_enum_values FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update metadata_enum_values"
  ON metadata_enum_values FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete metadata_enum_values"
  ON metadata_enum_values FOR DELETE
  USING (auth.role() = 'authenticated');

