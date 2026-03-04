-- Phase 1: Store selling price and cost price at time of sale for historical accuracy
-- Buying/cost price for recipe cost and cost calculations (selling price remains unit_price)
ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(15,4) NULL;

-- Store selling price and cost price at time of sale for historical accuracy
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,4) NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(15,4) NULL;

-- Phase 2: Price and cost history by date for time-varying item prices
-- item_selling_price_history: effective_date + unit_price per item
CREATE TABLE IF NOT EXISTS item_selling_price_history (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  unit_price DECIMAL(15,4) NOT NULL,
  UNIQUE(item_id, effective_date)
);
CREATE INDEX IF NOT EXISTS idx_item_selling_price_history_item_date ON item_selling_price_history(item_id, effective_date DESC);

-- item_cost_history: effective_date + unit_cost per item
CREATE TABLE IF NOT EXISTS item_cost_history (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  unit_cost DECIMAL(15,4) NOT NULL,
  UNIQUE(item_id, effective_date)
);
CREATE INDEX IF NOT EXISTS idx_item_cost_history_item_date ON item_cost_history(item_id, effective_date DESC);

-- Phase 3: Migrate existing unit_price to item_selling_price_history, then drop the column.
-- Effective date = item created_at date so "current" resolution still returns this value until newer history exists.
INSERT INTO item_selling_price_history (item_id, effective_date, unit_price)
SELECT i.id, COALESCE(i.created_at::date, '2000-01-01'), i.unit_price
FROM items i
WHERE i.unit_price IS NOT NULL
ON CONFLICT (item_id, effective_date) DO UPDATE SET unit_price = EXCLUDED.unit_price;

ALTER TABLE items DROP COLUMN IF EXISTS unit_price;

-- Phase 4: Convert sales.date to TIMESTAMPTZ
-- Sales: store date + time (TIMESTAMPTZ). Existing rows: date at midnight UTC.
ALTER TABLE sales
  ALTER COLUMN date TYPE TIMESTAMPTZ
  USING (date::text || ' 00:00:00+00')::timestamptz;
