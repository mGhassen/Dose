-- Rekey recipe modifier quantities from per-list to per-modifier.
-- Replaces recipe_modifier_list_quantities so each modifier option inside a list
-- can have its own quantity for a given recipe (Oat 150ml vs Regular 200ml).

DROP TABLE IF EXISTS public.recipe_modifier_list_quantities CASCADE;

CREATE TABLE IF NOT EXISTS public.recipe_modifier_quantities (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  modifier_id BIGINT NOT NULL REFERENCES public.modifiers(id) ON DELETE CASCADE,
  quantity DECIMAL(12, 4) NOT NULL CHECK (quantity >= 0),
  unit_id BIGINT REFERENCES public.variables(id) ON DELETE SET NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recipe_modifier_quantities_unique UNIQUE (recipe_id, modifier_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_modifier_quantities_recipe
  ON public.recipe_modifier_quantities(recipe_id);

CREATE INDEX IF NOT EXISTS idx_recipe_modifier_quantities_modifier
  ON public.recipe_modifier_quantities(modifier_id);

CREATE TRIGGER update_recipe_modifier_quantities_updated_at
  BEFORE UPDATE ON public.recipe_modifier_quantities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.recipe_modifier_quantities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage recipe_modifier_quantities for own integrations"
  ON public.recipe_modifier_quantities FOR ALL
  USING (
    modifier_id IN (
      SELECT m.id FROM public.modifiers m
      JOIN public.modifier_lists ml ON ml.id = m.modifier_list_id
      WHERE ml.integration_id IN (
        SELECT id FROM public.integrations WHERE account_id IN (
          SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    modifier_id IN (
      SELECT m.id FROM public.modifiers m
      JOIN public.modifier_lists ml ON ml.id = m.modifier_list_id
      WHERE ml.integration_id IN (
        SELECT id FROM public.integrations WHERE account_id IN (
          SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

COMMENT ON TABLE public.recipe_modifier_quantities IS
  'Per-recipe quantity bound to an individual modifier option. The specific option (and this row) is resolved at sale time when the customer picks a modifier.';
