-- Logical merge of items via item_groups.
-- Items stay physically separate (Square sync, history, line items all keep their own rows);
-- item_groups just declares that N items are the same logical product with one canonical.

CREATE TABLE item_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  canonical_item_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE item_groups
  ADD CONSTRAINT item_groups_canonical_item_id_unique UNIQUE (canonical_item_id);

ALTER TABLE items
  ADD COLUMN group_id BIGINT REFERENCES item_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_items_group_id ON items(group_id);

-- FK canonical_item_id -> items(id); uses RESTRICT so a canonical item cannot be
-- hard-deleted while still owning a group (app must unmerge or swap canonical first).
ALTER TABLE item_groups
  ADD CONSTRAINT item_groups_canonical_item_id_fkey
  FOREIGN KEY (canonical_item_id) REFERENCES items(id) ON DELETE RESTRICT;

-- Integrity: canonical item must be a member of its group (items.group_id = item_groups.id).
-- DEFERRED so create/update flows inside the RPC functions below can touch rows in either order
-- and only be validated once at transaction commit.
CREATE OR REPLACE FUNCTION validate_item_group_canonical()
RETURNS TRIGGER AS $$
DECLARE
  canonical_group_id BIGINT;
BEGIN
  SELECT group_id INTO canonical_group_id FROM items WHERE id = NEW.canonical_item_id;
  IF canonical_group_id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Canonical item % is not a member of group % (items.group_id=%)',
      NEW.canonical_item_id, NEW.id, canonical_group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER item_groups_canonical_membership
  AFTER INSERT OR UPDATE OF canonical_item_id ON item_groups
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_item_group_canonical();

CREATE OR REPLACE FUNCTION update_item_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER item_groups_set_updated_at
  BEFORE UPDATE ON item_groups
  FOR EACH ROW EXECUTE FUNCTION update_item_groups_updated_at();

ALTER TABLE item_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read item_groups"
  ON item_groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert item_groups"
  ON item_groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update item_groups"
  ON item_groups FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete item_groups"
  ON item_groups FOR DELETE
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- RPC helpers (used by the app to keep the group <-> members invariant atomic
-- across the two tables, which Supabase JS cannot do in a single request).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_item_group(
  p_name TEXT,
  p_canonical_item_id BIGINT,
  p_member_ids BIGINT[]
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id BIGINT;
  v_conflict BIGINT;
BEGIN
  IF p_member_ids IS NULL OR array_length(p_member_ids, 1) < 2 THEN
    RAISE EXCEPTION 'At least 2 items are required to create a group';
  END IF;
  IF NOT (p_canonical_item_id = ANY(p_member_ids)) THEN
    RAISE EXCEPTION 'Canonical item % must be included in member ids', p_canonical_item_id;
  END IF;

  SELECT id INTO v_conflict FROM items
    WHERE id = ANY(p_member_ids) AND group_id IS NOT NULL
    LIMIT 1;
  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Item % already belongs to a group', v_conflict;
  END IF;

  INSERT INTO item_groups (name, canonical_item_id)
    VALUES (p_name, p_canonical_item_id)
    RETURNING id INTO v_group_id;

  UPDATE items SET group_id = v_group_id WHERE id = ANY(p_member_ids);

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_item_group(TEXT, BIGINT, BIGINT[]) TO authenticated;

CREATE OR REPLACE FUNCTION add_items_to_group(
  p_group_id BIGINT,
  p_member_ids BIGINT[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM item_groups WHERE id = p_group_id) THEN
    RAISE EXCEPTION 'Group % not found', p_group_id;
  END IF;

  SELECT id INTO v_conflict FROM items
    WHERE id = ANY(p_member_ids)
      AND group_id IS NOT NULL
      AND group_id <> p_group_id
    LIMIT 1;
  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Item % already belongs to another group', v_conflict;
  END IF;

  UPDATE items SET group_id = p_group_id WHERE id = ANY(p_member_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION add_items_to_group(BIGINT, BIGINT[]) TO authenticated;

CREATE OR REPLACE FUNCTION remove_items_from_group(
  p_group_id BIGINT,
  p_member_ids BIGINT[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canonical BIGINT;
BEGIN
  SELECT canonical_item_id INTO v_canonical FROM item_groups WHERE id = p_group_id;
  IF v_canonical IS NULL THEN
    RAISE EXCEPTION 'Group % not found', p_group_id;
  END IF;
  IF v_canonical = ANY(p_member_ids) THEN
    RAISE EXCEPTION 'Cannot remove canonical item %; change canonical first or unmerge the group', v_canonical;
  END IF;

  UPDATE items SET group_id = NULL
    WHERE id = ANY(p_member_ids) AND group_id = p_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_items_from_group(BIGINT, BIGINT[]) TO authenticated;

CREATE OR REPLACE FUNCTION set_item_group_canonical(
  p_group_id BIGINT,
  p_new_canonical_id BIGINT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_group BIGINT;
BEGIN
  SELECT group_id INTO v_member_group FROM items WHERE id = p_new_canonical_id;
  IF v_member_group IS DISTINCT FROM p_group_id THEN
    RAISE EXCEPTION 'Item % is not a member of group %', p_new_canonical_id, p_group_id;
  END IF;

  UPDATE item_groups SET canonical_item_id = p_new_canonical_id WHERE id = p_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_item_group_canonical(BIGINT, BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION delete_item_group(p_group_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ON DELETE SET NULL on items.group_id clears member links automatically.
  DELETE FROM item_groups WHERE id = p_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_item_group(BIGINT) TO authenticated;
