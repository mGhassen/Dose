-- `unit_cost` applies to this many of `unit_id` (default 1 = price per one unit, e.g. €2.50 per 1 L).
ALTER TABLE public.item_cost_history
  ADD COLUMN IF NOT EXISTS cost_basis_quantity NUMERIC(15, 6) NOT NULL DEFAULT 1;
