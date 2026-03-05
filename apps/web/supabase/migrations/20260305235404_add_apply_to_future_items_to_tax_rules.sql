-- Tax rules: apply to existing items only vs current and future items.
ALTER TABLE tax_rules ADD COLUMN IF NOT EXISTS apply_to_future_items BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN tax_rules.apply_to_future_items IS 'When false, tax applies only to items that existed when the rule was last saved (item.created_at <= rule.updated_at).';
