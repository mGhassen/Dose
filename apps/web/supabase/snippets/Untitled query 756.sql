-- Add unit column to sales table for quantity+unit when linked to item/recipe
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
