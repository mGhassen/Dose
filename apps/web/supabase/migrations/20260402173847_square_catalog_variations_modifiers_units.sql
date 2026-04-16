-- Square catalog: parent items, variations, modifier lists, links

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_catalog_parent BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.item_variations (
  id BIGSERIAL PRIMARY KEY,
  parent_item_id BIGINT NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  variant_item_id BIGINT NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  square_variation_id VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name_snapshot VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT item_variations_variant_unique UNIQUE (variant_item_id),
  CONSTRAINT item_variations_no_self CHECK (parent_item_id <> variant_item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_variations_parent ON public.item_variations(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_item_variations_square_variation ON public.item_variations(square_variation_id);

CREATE TABLE IF NOT EXISTS public.modifier_lists (
  id BIGSERIAL PRIMARY KEY,
  integration_id BIGINT NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  square_modifier_list_id VARCHAR(255) NOT NULL,
  name VARCHAR(500),
  selection_type VARCHAR(80),
  ordinal INTEGER,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT modifier_lists_integration_square_unique UNIQUE (integration_id, square_modifier_list_id)
);

CREATE INDEX IF NOT EXISTS idx_modifier_lists_integration ON public.modifier_lists(integration_id);

CREATE TABLE IF NOT EXISTS public.modifiers (
  id BIGSERIAL PRIMARY KEY,
  modifier_list_id BIGINT NOT NULL REFERENCES public.modifier_lists(id) ON DELETE CASCADE,
  square_modifier_id VARCHAR(255) NOT NULL,
  name VARCHAR(500),
  price_amount_cents BIGINT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  item_id BIGINT REFERENCES public.items(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT modifiers_list_square_unique UNIQUE (modifier_list_id, square_modifier_id)
);

CREATE INDEX IF NOT EXISTS idx_modifiers_list ON public.modifiers(modifier_list_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_item ON public.modifiers(item_id);

CREATE TABLE IF NOT EXISTS public.item_modifier_list_links (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  modifier_list_id BIGINT NOT NULL REFERENCES public.modifier_lists(id) ON DELETE CASCADE,
  min_selected INTEGER,
  max_selected INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT true,
  modifier_overrides JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT item_modifier_list_links_unique UNIQUE (item_id, modifier_list_id)
);

CREATE INDEX IF NOT EXISTS idx_item_modifier_links_item ON public.item_modifier_list_links(item_id);

CREATE TRIGGER update_modifier_lists_updated_at
  BEFORE UPDATE ON public.modifier_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.modifier_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_modifier_list_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage modifier_lists for own integrations"
  ON public.modifier_lists FOR ALL
  USING (
    integration_id IN (
      SELECT id FROM public.integrations WHERE account_id IN (
        SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    integration_id IN (
      SELECT id FROM public.integrations WHERE account_id IN (
        SELECT id FROM public.accounts WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage modifiers for own integrations"
  ON public.modifiers FOR ALL
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

CREATE POLICY "Users can manage item_modifier_list_links for own integrations"
  ON public.item_modifier_list_links FOR ALL
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
