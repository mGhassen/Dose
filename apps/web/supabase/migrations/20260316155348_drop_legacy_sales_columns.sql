-- Drop legacy single-line sale fields now that sale_line_items is the source of truth.
-- Header totals: keep subtotal, total_tax, total_discount; amount is derived (subtotal + total_tax - total_discount).

ALTER TABLE sales DROP COLUMN IF EXISTS item_id;
ALTER TABLE sales DROP COLUMN IF EXISTS quantity;
ALTER TABLE sales DROP COLUMN IF EXISTS unit;
ALTER TABLE sales DROP COLUMN IF EXISTS unit_id;
ALTER TABLE sales DROP COLUMN IF EXISTS unit_price;
ALTER TABLE sales DROP COLUMN IF EXISTS unit_cost;
ALTER TABLE sales DROP COLUMN IF EXISTS amount;

