/**
 * Resolve tax rate from tax_rules + variables (server-only).
 * Used by sales and expense APIs.
 */

type SupabaseClient = {
  from: (table: string) => {
    select: (cols?: string) => any;
    eq: (col: string, val: unknown) => any;
    is?: (col: string, val: unknown) => any;
    or?: (filter: string) => any;
    order?: (col: string, opts: { ascending: boolean }) => any;
    limit?: (n: number) => any;
    in?: (col: string, val: unknown[]) => any;
    single?: () => Promise<{ data: any; error: any }>;
    maybeSingle?: () => Promise<{ data: any; error: any }>;
  };
};

interface TaxRuleRow {
  id: number;
  variable_id: number;
  condition_type: string | null;
  condition_value: string | null;
  condition_values: string[] | null;
  scope_type: string;
  scope_item_ids: number[] | null;
  scope_categories: string[] | null;
  priority: number;
  variable_value?: number;
}

function scopeMatches(
  scopeType: string,
  scopeItemIds: number[] | null,
  scopeCategories: string[] | null,
  itemId: number | null,
  itemCategory: string | null
): boolean {
  if (scopeType === 'all') return true;
  if (scopeType === 'items' && scopeItemIds?.length && itemId != null) {
    return scopeItemIds.includes(itemId);
  }
  if (scopeType === 'categories' && scopeCategories?.length && itemCategory) {
    return scopeCategories.includes(itemCategory);
  }
  return false;
}

function ruleValidAt(rule: { effective_date?: string | null; end_date?: string | null }, dateStr: string): boolean {
  const date = new Date(dateStr);
  if (rule.effective_date && new Date(rule.effective_date) > date) return false;
  if (rule.end_date && new Date(rule.end_date) < date) return false;
  return true;
}

function conditionMatchesSalesType(rule: TaxRuleRow, salesType: string): boolean {
  const values = rule.condition_values;
  if (values && Array.isArray(values) && values.length > 0) {
    return values.includes(salesType);
  }
  return rule.condition_value === salesType;
}

export async function getTaxRateForSaleLine(
  supabase: SupabaseClient | any,
  itemId: number | null,
  itemCategory: string | null,
  salesType: string,
  dateStr: string
): Promise<number> {
  const { data: rules } = await supabase
    .from('tax_rules')
    .select(
      'id, variable_id, condition_type, condition_value, condition_values, scope_type, scope_item_ids, scope_categories, priority, effective_date, end_date'
    )
    .eq('condition_type', 'sales_type')
    .order('priority', { ascending: true });

  if (!rules?.length) return getItemDefaultTaxRate(supabase, itemId);

  const matching = (rules as (TaxRuleRow & { effective_date?: string; end_date?: string })[]).filter((r) =>
    conditionMatchesSalesType(r, salesType)
  );
  if (!matching.length) return getItemDefaultTaxRate(supabase, itemId);

  const variableIds = [...new Set(matching.map((r) => r.variable_id))];
  const { data: variables } = await supabase
    .from('variables')
    .select('id, value, is_active, effective_date, end_date')
    .in('id', variableIds);
  const varMap = new Map((variables || []).map((v: any) => [v.id, v]));

  const date = dateStr.slice(0, 10);
  for (const r of matching) {
    if (!ruleValidAt(r, date)) continue;
    const variable = varMap.get(r.variable_id);
    const v = variable as { is_active?: boolean; value?: unknown; effective_date?: string | null; end_date?: string | null };
    if (!v?.is_active || !ruleValidAt(v, date)) continue;
    if (!scopeMatches(r.scope_type, r.scope_item_ids, r.scope_categories, itemId, itemCategory)) continue;
    return parseFloat(String(v.value));
  }

  return getItemDefaultTaxRate(supabase, itemId);
}

export async function getTaxRateForExpenseLine(
  supabase: SupabaseClient | any,
  itemId: number | null,
  itemCategory: string | null,
  dateStr: string
): Promise<number> {
  const { data: rules } = await supabase
    .from('tax_rules')
    .select(
      'id, variable_id, condition_type, condition_value, condition_values, scope_type, scope_item_ids, scope_categories, priority, effective_date, end_date'
    )
    .eq('condition_type', 'expense')
    .order('priority', { ascending: true });

  if (!rules?.length) return getItemDefaultTaxRate(supabase, itemId);

  const variableIds = [...new Set((rules as { variable_id: number }[]).map((r) => r.variable_id))];
  const { data: variables } = await supabase
    .from('variables')
    .select('id, value, is_active, effective_date, end_date')
    .in('id', variableIds);
  const varMap = new Map((variables || []).map((v: any) => [v.id, v]));

  const date = dateStr.slice(0, 10);
  for (const r of rules as (TaxRuleRow & { effective_date?: string; end_date?: string })[]) {
    if (!ruleValidAt(r, date)) continue;
    const variable = varMap.get(r.variable_id);
    const v = variable as { is_active?: boolean; value?: unknown; effective_date?: string | null; end_date?: string | null };
    if (!v?.is_active || !ruleValidAt(v, date)) continue;
    if (!scopeMatches(r.scope_type, r.scope_item_ids, r.scope_categories, itemId, itemCategory)) continue;
    return parseFloat(String(v.value));
  }

  return getItemDefaultTaxRate(supabase, itemId);
}

async function getItemDefaultTaxRate(
  supabase: SupabaseClient,
  itemId: number | null
): Promise<number> {
  if (itemId == null) return 0;
  const { data: item } = await supabase
    .from('items')
    .select('default_tax_rate_percent')
    .eq('id', itemId)
    .maybeSingle();
  if (item?.default_tax_rate_percent != null) return parseFloat(String(item.default_tax_rate_percent));
  return 0;
}
