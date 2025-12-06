-- Remove foreign key constraint from sales.item_id
-- This allows item_id to reference either items(id) or recipes(id)
-- We'll validate this in the application layer

-- Drop the foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sales_item_id_fkey'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT sales_item_id_fkey;
  END IF;
END $$;

-- Keep the index for performance
-- Index already exists from previous migration

