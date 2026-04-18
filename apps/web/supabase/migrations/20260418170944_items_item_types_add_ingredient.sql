-- Add 'ingredient' to allowed item_types. Additive tag: an item can be both ingredient and modifier (e.g. Oat Milk).

ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_item_types_allowed;

ALTER TABLE public.items ADD CONSTRAINT items_item_types_allowed CHECK (
  item_types <@ ARRAY['item', 'product', 'modifier', 'ingredient']::TEXT[]
  AND cardinality(item_types) >= 1
);

COMMENT ON COLUMN public.items.item_types IS 'Logical roles: item, product, modifier, ingredient; combine as needed.';
