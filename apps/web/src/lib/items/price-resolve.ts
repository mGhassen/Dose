/**
 * Resolve item selling price or cost as of a given date from history tables.
 * Falls back to items.unit_price / items.unit_cost when no history row exists.
 */

export async function getItemSellingPriceAsOf(
  supabase: { from: (t: string) => any },
  itemId: number,
  dateStr: string
): Promise<number | null> {
  const { data: historyRow } = await supabase
    .from('item_selling_price_history')
    .select('unit_price')
    .eq('item_id', itemId)
    .lte('effective_date', dateStr)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyRow?.unit_price != null) return parseFloat(historyRow.unit_price);

  const { data: item } = await supabase
    .from('items')
    .select('unit_price')
    .eq('id', itemId)
    .single();

  if (item?.unit_price != null) return parseFloat(item.unit_price);
  return null;
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

  const { data: item } = await supabase
    .from('items')
    .select('unit_cost')
    .eq('id', itemId)
    .single();

  if (item?.unit_cost != null) return parseFloat(item.unit_cost);
  return null;
}
