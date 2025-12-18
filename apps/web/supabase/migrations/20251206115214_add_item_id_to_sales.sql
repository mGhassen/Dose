-- Add item_id to sales table to link sales to items/recipes
ALTER TABLE sales ADD COLUMN IF NOT EXISTS item_id BIGINT REFERENCES items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_item_id ON sales(item_id);



