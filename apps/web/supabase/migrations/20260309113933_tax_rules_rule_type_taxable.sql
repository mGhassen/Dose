-- Tax rules: rule_type = 'taxable' | 'exemption' (exemption = 0%, taxable = apply variable rate).
UPDATE tax_rules SET rule_type = 'taxable' WHERE rule_type = 'reduction';
-- Allow 'taxable' as valid value (column already accepts any varchar).
COMMENT ON COLUMN tax_rules.rule_type IS 'taxable = apply variable rate; exemption = 0% for this scope/condition';

-- Cost and tax come from history and tax_rules only; remove from items.
ALTER TABLE items DROP COLUMN IF EXISTS unit_cost;
ALTER TABLE items DROP COLUMN IF EXISTS default_tax_rate_percent;


-- Produced items (from recipes) use item_type = 'product' instead of 'item'.
UPDATE items SET item_type = 'product' WHERE produced_from_recipe_id IS NOT NULL AND (item_type IS NULL OR item_type = 'item');
