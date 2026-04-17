-- Item kinds are only item | product | modifier (recipes stay in recipes table).

UPDATE public.items SET item_types = array_remove(item_types, 'recipe');

UPDATE public.items
SET item_types = ARRAY['item']::TEXT[]
WHERE cardinality(item_types) < 1;

ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_item_types_allowed;

ALTER TABLE public.items ADD CONSTRAINT items_item_types_allowed CHECK (
  item_types <@ ARRAY['item', 'product', 'modifier']::TEXT[]
  AND cardinality(item_types) >= 1
);

COMMENT ON COLUMN public.items.item_types IS 'Logical roles: item, product, modifier; combine as needed.';
