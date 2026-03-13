-- Allow multiple cost history entries per item per date (no overwrite)
ALTER TABLE item_cost_history
  DROP CONSTRAINT IF EXISTS item_cost_history_item_id_effective_date_key;

