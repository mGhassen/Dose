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
