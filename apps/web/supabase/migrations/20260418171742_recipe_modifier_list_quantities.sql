-- Per-recipe quantity for each modifier list attached to the produced item.
-- Whichever modifier option the customer picks at sale time consumes `quantity` of that option's supply item.

CREATE TABLE IF NOT EXISTS public.recipe_modifier_list_quantities (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  modifier_list_id BIGINT NOT NULL REFERENCES public.modifier_lists(id) ON DELETE CASCADE,
  quantity DECIMAL(12, 4) NOT NULL CHECK (quantity >= 0),
  unit_id BIGINT REFERENCES public.variables(id) ON DELETE SET NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recipe_modifier_list_quantities_unique UNIQUE (recipe_id, modifier_list_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_modifier_list_quantities_recipe
  ON public.recipe_modifier_list_quantities(recipe_id);

CREATE INDEX IF NOT EXISTS idx_recipe_modifier_list_quantities_modifier_list
  ON public.recipe_modifier_list_quantities(modifier_list_id);

CREATE TRIGGER update_recipe_modifier_list_quantities_updated_at
  BEFORE UPDATE ON public.recipe_modifier_list_quantities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.recipe_modifier_list_quantities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage recipe_modifier_list_quantities for own integrations"
  ON public.recipe_modifier_list_quantities FOR ALL
  USING (
    modifier_list_id IN (
      SELECT id FROM public.modifier_lists WHERE integration_id IN (
        SELECT id FROM public.integrations WHERE account_id IN (
          SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    modifier_list_id IN (
      SELECT id FROM public.modifier_lists WHERE integration_id IN (
        SELECT id FROM public.integrations WHERE account_id IN (
          SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

COMMENT ON TABLE public.recipe_modifier_list_quantities IS
  'Per-recipe quantity bound to a modifier_list (e.g. Latte: Milk list = 200ml). The specific modifier option is resolved at sale time.';
