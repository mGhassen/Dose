-- Item type is already on items (item_type). Ensure we support product/item.
-- Add type (variable type, same as in variables) for classification.
ALTER TABLE items ADD COLUMN IF NOT EXISTS type VARCHAR(50) NULL;
