ALTER TABLE public.items
  ADD COLUMN affects_stock boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.items.affects_stock IS
  'When false, sale lines for this item do not create stock movements. Used for modifiers like hot/cold that should not deduct inventory.';
