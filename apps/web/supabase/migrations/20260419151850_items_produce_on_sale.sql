ALTER TABLE public.items
  ADD COLUMN produce_on_sale boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.items.produce_on_sale IS
  'When true and the item has no produced_from_recipe_id, sale lines record paired IN+OUT stock movements. When syncing from Square, the catalog review step defaults this to true for new items.';
