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
  rule_type?: string | null;
  calculation_type?: string | null;
  variable_value?: number;
  apply_to_future_items?: boolean;
  updated_at?: string;
}

const RULE_SELECT =
  'id, variable_id, condition_type, condition_value, condition_values, scope_type, scope_item_ids, scope_categories, priority, rule_type, calculation_type, effective_date, end_date, apply_to_future_items, updated_at';

function itemExcludedByExistingOnly(
  applyToFutureItems: boolean | undefined,
  ruleUpdatedAt: string | undefined,
  itemCreatedAt: string | null | undefined
): boolean {
  if (applyToFutureItems !== false || !ruleUpdatedAt || !itemCreatedAt) return false;
  return new Date(itemCreatedAt) > new Date(ruleUpdatedAt);
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
  dateStr: string,
  itemCreatedAt?: string | null
): Promise<number> {
  const { data: rules } = await supabase
    .from('tax_rules')
    .select(RULE_SELECT)
    .eq('condition_type', 'sales_type')
    .order('priority', { ascending: true });

  if (!rules?.length) return 0;

  const matching = (rules as (TaxRuleRow & { effective_date?: string; end_date?: string })[]).filter((r) =>
    conditionMatchesSalesType(r, salesType)
  );
  if (!matching.length) return 0;

  const date = dateStr.slice(0, 10);
  for (const r of matching) {
    if (!ruleValidAt(r, date)) continue;
    if (!scopeMatches(r.scope_type, r.scope_item_ids, r.scope_categories, itemId, itemCategory)) continue;
    if (itemExcludedByExistingOnly(r.apply_to_future_items, r.updated_at, itemCreatedAt)) continue;
    if (r.rule_type === 'exemption') return 0;
    const variableIds = [r.variable_id];
    const { data: variables } = await supabase
      .from('variables')
      .select('id, value, is_active, effective_date, end_date')
      .in('id', variableIds);
    const v = variables?.[0] as { is_active?: boolean; value?: unknown; effective_date?: string | null; end_date?: string | null } | undefined;
    if (!v?.is_active || !ruleValidAt(v, date)) continue;
    return parseFloat(String(v.value));
  }

  return 0;
}

export interface TaxRateAndRule {
  rate: number;
  variableName?: string;
  conditionType?: string | null;
  conditionValue?: string | null;
  taxInclusive?: boolean;
}

export async function getTaxRateAndRuleForSaleLine(
  supabase: SupabaseClient | any,
  itemId: number | null,
  itemCategory: string | null,
  salesType: string,
  dateStr: string,
  itemCreatedAt?: string | null
): Promise<TaxRateAndRule> {
  const { data: rules } = await supabase
    .from('tax_rules')
    .select(RULE_SELECT)
    .eq('condition_type', 'sales_type')
    .order('priority', { ascending: true });

  if (!rules?.length) return { rate: 0 };

  const matching = (rules as (TaxRuleRow & { effective_date?: string; end_date?: string })[]).filter((r) =>
    conditionMatchesSalesType(r, salesType)
  );
  if (!matching.length) return { rate: 0 };

  const date = dateStr.slice(0, 10);
  for (const r of matching) {
    if (!ruleValidAt(r, date)) continue;
    if (!scopeMatches(r.scope_type, r.scope_item_ids, r.scope_categories, itemId, itemCategory)) continue;
    if (itemExcludedByExistingOnly(r.apply_to_future_items, r.updated_at, itemCreatedAt)) continue;
    if (r.rule_type === 'exemption') {
      return { rate: 0, conditionType: r.condition_type, conditionValue: salesType };
    }
    const { data: variables } = await supabase
      .from('variables')
      .select('id, name, value, payload, is_active, effective_date, end_date')
      .in('id', [r.variable_id]);
    const v = variables?.[0] as { name?: string; payload?: { calculationType?: string } | null; is_active?: boolean; value?: unknown; effective_date?: string | null; end_date?: string | null } | undefined;
    if (!v?.is_active || !ruleValidAt(v, date)) continue;
    const taxInclusive = r.calculation_type != null ? r.calculation_type === 'inclusive' : (v.payload?.calculationType === 'inclusive');
    return {
      rate: parseFloat(String(v.value)),
      variableName: v.name,
      conditionType: r.condition_type,
      conditionValue: salesType,
      taxInclusive,
    };
  }

  return { rate: 0 };
}

export async function getTaxRateAndRuleForExpenseLine(
  supabase: SupabaseClient | any,
  itemId: number | null,
  itemCategory: string | null,
  dateStr: string,
  itemCreatedAt?: string | null
): Promise<TaxRateAndRule> {
  const { data: rules } = await supabase
    .from('tax_rules')
    .select(RULE_SELECT)
    .eq('condition_type', 'expense')
    .order('priority', { ascending: true });

  if (!rules?.length) return { rate: 0 };

  const date = dateStr.slice(0, 10);
  for (const r of rules as (TaxRuleRow & { effective_date?: string; end_date?: string })[]) {
    if (!ruleValidAt(r, date)) continue;
    if (!scopeMatches(r.scope_type, r.scope_item_ids, r.scope_categories, itemId, itemCategory)) continue;
    if (itemExcludedByExistingOnly(r.apply_to_future_items, r.updated_at, itemCreatedAt)) continue;
    if (r.rule_type === 'exemption') {
      return { rate: 0, conditionType: r.condition_type, conditionValue: 'expense' };
    }
    const { data: variables } = await supabase
      .from('variables')
      .select('id, name, value, payload, is_active, effective_date, end_date')
      .in('id', [r.variable_id]);
    const v = variables?.[0] as { name?: string; payload?: { calculationType?: string } | null; is_active?: boolean; value?: unknown; effective_date?: string | null; end_date?: string | null } | undefined;
    if (!v?.is_active || !ruleValidAt(v, date)) continue;
    const taxInclusive = r.calculation_type != null ? r.calculation_type === 'inclusive' : (v.payload?.calculationType === 'inclusive');
    return {
      rate: parseFloat(String(v.value)),
      variableName: v.name,
      conditionType: r.condition_type,
      conditionValue: 'expense',
      taxInclusive,
    };
  }

  return { rate: 0 };
}

export async function getTaxRateForExpenseLine(
  supabase: SupabaseClient | any,
  itemId: number | null,
  itemCategory: string | null,
  dateStr: string,
  itemCreatedAt?: string | null
): Promise<number> {
  const { data: rules } = await supabase
    .from('tax_rules')
    .select(RULE_SELECT)
    .eq('condition_type', 'expense')
    .order('priority', { ascending: true });

  if (!rules?.length) return 0;

  const date = dateStr.slice(0, 10);
  for (const r of rules as (TaxRuleRow & { effective_date?: string; end_date?: string })[]) {
    if (!ruleValidAt(r, date)) continue;
    if (!scopeMatches(r.scope_type, r.scope_item_ids, r.scope_categories, itemId, itemCategory)) continue;
    if (itemExcludedByExistingOnly(r.apply_to_future_items, r.updated_at, itemCreatedAt)) continue;
    if (r.rule_type === 'exemption') return 0;
    const { data: variables } = await supabase
      .from('variables')
      .select('id, value, is_active, effective_date, end_date')
      .in('id', [r.variable_id]);
    const v = variables?.[0] as { is_active?: boolean; value?: unknown; effective_date?: string | null; end_date?: string | null } | undefined;
    if (!v?.is_active || !ruleValidAt(v, date)) continue;
    return parseFloat(String(v.value));
  }

  return 0;
}
