-- Modifier lines: optional parent row (base product line) for the same sale.

ALTER TABLE public.sale_line_items
  ADD COLUMN IF NOT EXISTS parent_sale_line_id BIGINT REFERENCES public.sale_line_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sale_line_items_parent ON public.sale_line_items(parent_sale_line_id);

COMMENT ON COLUMN public.sale_line_items.parent_sale_line_id IS 'Modifier/add-on line linked to a base sale line (same sale).';
