/**
 * Resolve item-level taxes from item_taxes table; apply tax_rules to items.
 * Consumers use getItemTaxesForCondition; no tax_rules fallback.
 */

import type { TaxRateAndRule } from '@/lib/tax-rules-resolve';

type SupabaseClient = {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: any) => any;
    update: (row: any) => any;
    upsert: (row: any, opts?: any) => any;
    eq: (col: string, val: unknown) => any;
    is?: (col: string, val: unknown) => any;
    in?: (col: string, val: unknown[]) => any;
    or?: (filter: string) => any;
    order?: (col: string, opts: { ascending: boolean }) => any;
    limit?: (n: number) => any;
    gte?: (col: string, val: unknown) => any;
    lte?: (col: string, val: unknown) => any;
    maybeSingle?: () => Promise<{ data: any; error: any }>;
    then?: (fn: (r: any) => any) => Promise<any>;
  };
};

function ruleValidAt(
  row: { effective_date?: string | null; end_date?: string | null },
  dateStr: string
): boolean {
  const date = new Date(dateStr.slice(0, 10));
  if (row.effective_date && new Date(row.effective_date) > date) return false;
  if (row.end_date && new Date(row.end_date) < date) return false;
  return true;
}

function conditionValueMatches(
  rowConditionValues: string[] | null,
  want: string | null
): boolean {
  if (want == null || want === '') return !rowConditionValues?.length;
  if (rowConditionValues && Array.isArray(rowConditionValues)) return rowConditionValues.includes(want);
  return false;
}

/**
 * Get tax for an item for a given condition (e.g. sales_type + 'on_site', or expense + null).
 * Returns first matching item_taxes row (by priority) with variable rate; taxInclusive from row or variable payload.
 */
export async function getItemTaxesForCondition(
  supabase: SupabaseClient | any,
  itemId: number,
  conditionType: string,
  conditionValue: string | null,
  dateStr: string
): Promise<TaxRateAndRule | null> {
  const date = dateStr.slice(0, 10);

  const { data: rows, error } = await supabase
    .from('item_taxes')
    .select('id, variable_id, calculation_type, priority, condition_values, effective_date, end_date')
    .eq('item_id', itemId)
    .eq('condition_type', conditionType)
    .order('priority', { ascending: true });

  if (error || !rows?.length) return null;

  const filtered = rows.filter(
    (row: any) =>
      conditionValueMatches(row.condition_values, conditionValue) &&
      ruleValidAt(row, date)
  );

  for (const row of filtered) {
    const { data: vars } = await supabase
      .from('variables')
      .select('id, name, value, payload, is_active, effective_date, end_date')
      .eq('id', row.variable_id)
      .maybeSingle();
    const v = vars as { name?: string; value?: unknown; payload?: { calculationType?: string } | null; is_active?: boolean; effective_date?: string | null; end_date?: string | null } | undefined;
    if (!v?.is_active || !ruleValidAt(v, date)) continue;

    const taxInclusive =
      row.calculation_type != null
        ? row.calculation_type === 'inclusive'
        : (v.payload?.calculationType === 'inclusive');

    return {
      rate: parseFloat(String(v.value)),
      variableName: v.name,
      conditionType,
      conditionValue: conditionValue ?? undefined,
      taxInclusive,
    };
  }
  return null;
}

/**
 * Resolve tax for a sale line from item_taxes only. No tax_rules fallback.
 */
export async function getTaxRateAndRuleForSaleLineWithItemTaxes(
  supabase: SupabaseClient | any,
  itemId: number | null,
  _itemCategory: string | null,
  salesType: string,
  dateStr: string,
  _itemCreatedAt?: string | null
): Promise<TaxRateAndRule> {
  if (itemId != null) {
    const itemTax = await getItemTaxesForCondition(supabase, itemId, 'sales_type', salesType, dateStr);
    if (itemTax != null) return itemTax;
  }
  return { rate: 0 };
}

/**
 * Resolve tax for an expense line from item_taxes only. No tax_rules fallback.
 */
export async function getTaxRateAndRuleForExpenseLineWithItemTaxes(
  supabase: SupabaseClient | any,
  itemId: number | null,
  _itemCategory: string | null,
  dateStr: string,
  _itemCreatedAt?: string | null
): Promise<TaxRateAndRule> {
  if (itemId != null) {
    const itemTax = await getItemTaxesForCondition(supabase, itemId, 'expense', null, dateStr);
    if (itemTax != null) return itemTax;
  }
  return { rate: 0 };
}

const RULE_SELECT =
  'id, variable_id, condition_type, condition_value, condition_values, scope_type, scope_item_ids, scope_categories, priority, calculation_type, effective_date, end_date, rule_type';

function scopeMatches(
  scopeType: string,
  scopeItemIds: number[] | null,
  scopeCategories: string[] | null,
  itemId: number,
  itemCategory: string | null
): boolean {
  if (scopeType === 'all') return true;
  if (scopeType === 'items' && scopeItemIds?.length) return scopeItemIds.includes(itemId);
  if (scopeType === 'categories' && scopeCategories?.length && itemCategory)
    return scopeCategories.includes(itemCategory);
  return false;
}

/**
 * Get item IDs in scope for a tax rule.
 */
async function getItemIdsInScope(
  supabase: SupabaseClient | any,
  rule: {
    scope_type: string;
    scope_item_ids: number[] | null;
    scope_categories: string[] | null;
  }
): Promise<number[]> {
  if (rule.scope_type === 'items' && rule.scope_item_ids?.length)
    return rule.scope_item_ids;
  if (rule.scope_type === 'categories' && rule.scope_categories?.length) {
    const { data: items } = await supabase
      .from('items')
      .select('id')
      .in('category', rule.scope_categories);
    return (items || []).map((r: { id: number }) => r.id);
  }
  if (rule.scope_type === 'all') {
    const { data: items } = await supabase.from('items').select('id');
    return (items || []).map((r: { id: number }) => r.id);
  }
  return [];
}

/**
 * Apply all tax_rules to items: for each rule, create/update item_taxes for every item in scope.
 */
export async function applyTaxRulesToItems(supabase: SupabaseClient | any): Promise<{ applied: number; errors: string[] }> {
  const { data: rules, error: rulesError } = await supabase
    .from('tax_rules')
    .select(RULE_SELECT)
    .order('priority', { ascending: true });

  if (rulesError || !rules?.length) return { applied: 0, errors: rulesError ? [rulesError.message] : [] };

  let applied = 0;
  const errors: string[] = [];

  for (const r of rules as any[]) {
    if (r.rule_type === 'exemption') continue;

    const itemIds = await getItemIdsInScope(supabase, r);
    const conditionValues: string[] | null =
      Array.isArray(r.condition_values) && r.condition_values.length > 0
        ? r.condition_values
        : r.condition_value != null
          ? [r.condition_value]
          : null;

    for (const itemId of itemIds) {
      let existingQuery = supabase
        .from('item_taxes')
        .select('id')
        .eq('item_id', itemId)
        .eq('condition_type', r.condition_type)
        .eq('variable_id', r.variable_id)
        .eq('condition_values', conditionValues);
      const { data: existingRow } = await existingQuery.maybeSingle();
      const existing = existingRow ? { data: existingRow } : null;

      const row = {
        item_id: itemId,
        variable_id: r.variable_id,
        condition_type: r.condition_type,
        condition_values: conditionValues,
        calculation_type: r.calculation_type ?? null,
        priority: r.priority ?? 0,
        effective_date: r.effective_date ?? null,
        end_date: r.end_date ?? null,
        updated_at: new Date().toISOString(),
      };

      if (existing?.data?.id) {
        const { error } = await supabase.from('item_taxes').update(row).eq('id', existing.data.id);
        if (error) errors.push(`item_taxes update ${existing.data.id}: ${error.message}`);
        else applied++;
      } else {
        const { error } = await supabase.from('item_taxes').insert(row);
        if (error) errors.push(`item_taxes insert item ${itemId}: ${error.message}`);
        else applied++;
      }
    }
  }
  return { applied, errors };
}

/**
 * Apply tax_rules to a single item: create/update item_taxes for this item for every matching rule.
 */
export async function applyTaxRulesToItem(
  supabase: SupabaseClient | any,
  itemId: number,
  itemCategory: string | null
): Promise<{ applied: number; errors: string[] }> {
  const { data: rules, error: rulesError } = await supabase
    .from('tax_rules')
    .select(RULE_SELECT)
    .order('priority', { ascending: true });

  if (rulesError || !rules?.length) return { applied: 0, errors: rulesError ? [rulesError.message] : [] };

  let applied = 0;
  const errors: string[] = [];

  for (const r of rules as any[]) {
    if (r.rule_type === 'exemption') continue;
    if (!scopeMatches(r.scope_type, r.scope_item_ids, r.scope_categories, itemId, itemCategory)) continue;

    const conditionValues: string[] | null =
      Array.isArray(r.condition_values) && r.condition_values.length > 0
        ? r.condition_values
        : r.condition_value != null
          ? [r.condition_value]
          : null;

    let existingQuery = supabase
      .from('item_taxes')
      .select('id')
      .eq('item_id', itemId)
      .eq('condition_type', r.condition_type)
      .eq('variable_id', r.variable_id)
      .eq('condition_values', conditionValues);
    const { data: existingRow } = await existingQuery.maybeSingle();
    const existing = existingRow ? { data: existingRow } : null;

    const row = {
      item_id: itemId,
      variable_id: r.variable_id,
      condition_type: r.condition_type,
      condition_values: conditionValues,
      calculation_type: r.calculation_type ?? null,
      priority: r.priority ?? 0,
      effective_date: r.effective_date ?? null,
      end_date: r.end_date ?? null,
      updated_at: new Date().toISOString(),
    };

    if (existing?.data?.id) {
      const { error } = await supabase.from('item_taxes').update(row).eq('id', existing.data.id);
      if (error) errors.push(`item_taxes update ${existing.data.id}: ${error.message}`);
      else applied++;
    } else {
      const { error } = await supabase.from('item_taxes').insert(row);
      if (error) errors.push(`item_taxes insert: ${error.message}`);
      else applied++;
    }
  }
  return { applied, errors };
}
