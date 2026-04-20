-- Denominate each cost history row: unit_cost is money per this unit (variables.id, type = unit).
ALTER TABLE public.item_cost_history
  ADD COLUMN IF NOT EXISTS unit_id BIGINT NULL REFERENCES public.variables(id) ON DELETE SET NULL;

UPDATE public.item_cost_history ich
SET unit_id = i.unit_id
FROM public.items i
WHERE i.id = ich.item_id
  AND ich.unit_id IS NULL;
