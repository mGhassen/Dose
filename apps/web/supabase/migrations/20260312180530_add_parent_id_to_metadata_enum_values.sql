-- Two-level hierarchy for metadata_enum_values (e.g. category > subcategory)
ALTER TABLE metadata_enum_values
  ADD COLUMN parent_id BIGINT NULL REFERENCES metadata_enum_values(id) ON DELETE SET NULL;

CREATE INDEX idx_metadata_enum_values_parent_id ON metadata_enum_values(parent_id);

-- Enforce: parent_id must reference a top-level value in the same enum (trigger; CHECK cannot use subqueries)
CREATE OR REPLACE FUNCTION metadata_enum_values_check_parent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM metadata_enum_values p
      WHERE p.id = NEW.parent_id
        AND p.enum_id = NEW.enum_id
        AND p.parent_id IS NULL
    ) THEN
      RAISE EXCEPTION 'parent_id must reference a top-level value of the same enum';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_metadata_enum_values_parent
  BEFORE INSERT OR UPDATE OF parent_id ON metadata_enum_values
  FOR EACH ROW EXECUTE PROCEDURE metadata_enum_values_check_parent();
