-- Multi-valued item roles (replaces single item_type). Refine allowed kinds in a later migration.

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS item_types TEXT[] NOT NULL DEFAULT ARRAY['item']::TEXT[];

UPDATE public.items SET item_types = CASE COALESCE(item_type, 'item')
  WHEN 'item' THEN ARRAY['item']::TEXT[]
  WHEN 'product' THEN ARRAY['product']::TEXT[]
  WHEN 'item_and_product' THEN ARRAY['item', 'product']::TEXT[]
  WHEN 'recipe' THEN ARRAY['item']::TEXT[]
  WHEN 'modifier' THEN ARRAY['modifier']::TEXT[]
  ELSE ARRAY['item']::TEXT[]
END;

DROP INDEX IF EXISTS idx_items_item_type;

ALTER TABLE public.items DROP COLUMN IF EXISTS item_type;

ALTER TABLE public.items ADD CONSTRAINT items_item_types_allowed CHECK (
  item_types <@ ARRAY['item', 'product', 'recipe', 'modifier']::TEXT[]
  AND cardinality(item_types) >= 1
);

CREATE INDEX IF NOT EXISTS idx_items_item_types ON public.items USING GIN (item_types);

COMMENT ON COLUMN public.items.item_types IS 'Logical roles for this row; may combine (e.g. item + product).';
