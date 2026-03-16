-- Drop legacy single-line sale fields now that sale_line_items is the source of truth.
-- Note: `subtotal`, `total_tax`, `total_discount`, and `amount` remain as sale header totals.

ALTER TABLE sales DROP COLUMN IF EXISTS item_id;
ALTER TABLE sales DROP COLUMN IF EXISTS quantity;
ALTER TABLE sales DROP COLUMN IF EXISTS unit;
ALTER TABLE sales DROP COLUMN IF EXISTS unit_id;
ALTER TABLE sales DROP COLUMN IF EXISTS unit_price;
ALTER TABLE sales DROP COLUMN IF EXISTS unit_cost;

