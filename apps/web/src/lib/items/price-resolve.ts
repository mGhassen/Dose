/**
 * Resolve item selling price or cost as of a given date from history tables only.
 */

export interface ItemSellingPriceAsOf {
  unitPrice: number | null;
  taxIncluded: boolean | null;
}

export async function getItemSellingPriceAsOf(
  supabase: { from: (t: string) => any },
  itemId: number,
  dateStr: string
): Promise<ItemSellingPriceAsOf> {
  const { data: historyRow } = await supabase
    .from('item_selling_price_history')
    .select('unit_price, tax_included')
    .eq('item_id', itemId)
    .lte('effective_date', dateStr)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyRow?.unit_price == null) return { unitPrice: null, taxIncluded: null };
  return {
    unitPrice: parseFloat(historyRow.unit_price),
    taxIncluded: historyRow.tax_included != null ? !!historyRow.tax_included : null,
  };
}

export async function getItemCostAsOf(
  supabase: { from: (t: string) => any },
  itemId: number,
  dateStr: string
): Promise<number | null> {
  const { data: historyRow } = await supabase
    .from('item_cost_history')
    .select('unit_cost')
    .eq('item_id', itemId)
    .lte('effective_date', dateStr)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyRow?.unit_cost != null) return parseFloat(historyRow.unit_cost);
  return null;
}
