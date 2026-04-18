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
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyRow?.unit_price == null) return { unitPrice: null, taxIncluded: null };
  return {
    unitPrice: parseFloat(historyRow.unit_price),
    taxIncluded: historyRow.tax_included != null ? !!historyRow.tax_included : null,
  };
}

export interface ItemCostAsOf {
  unitCost: number | null;
  taxIncluded: boolean | null;
}

export async function getItemCostAsOf(
  supabase: { from: (t: string) => any },
  itemId: number,
  dateStr: string
): Promise<ItemCostAsOf> {
  const { data: historyRow } = await supabase
    .from('item_cost_history')
    .select('unit_cost, tax_included')
    .eq('item_id', itemId)
    .lte('effective_date', dateStr)
    .order('effective_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyRow?.unit_cost == null) return { unitCost: null, taxIncluded: null };
  return {
    unitCost: parseFloat(historyRow.unit_cost),
    taxIncluded: historyRow.tax_included != null ? !!historyRow.tax_included : null,
  };
}

/**
 * Resolve `getItemCostAsOf` for many (itemId, dateStr) pairs with one query per
 * item-id batch. Cost history is monotone in effective_date, so we fetch every
 * row per item up to the latest requested date, then resolve each (item, date)
 * in memory by picking the most recent row on or before that date.
 */
export async function getItemCostsAsOfBatch(
  supabase: { from: (t: string) => any },
  pairs: { itemId: number; dateStr: string }[]
): Promise<Map<string, ItemCostAsOf>> {
  const out = new Map<string, ItemCostAsOf>();
  if (pairs.length === 0) return out;

  const maxDateByItem = new Map<number, string>();
  for (const p of pairs) {
    const cur = maxDateByItem.get(p.itemId);
    if (!cur || p.dateStr > cur) maxDateByItem.set(p.itemId, p.dateStr);
  }
  const itemIds = Array.from(maxDateByItem.keys());
  const latestMax = Array.from(maxDateByItem.values()).reduce(
    (a, b) => (a > b ? a : b),
    ''
  );

  const CHUNK = 500;
  const rowsByItem = new Map<number, { effective_date: string; unit_cost: string | null; tax_included: boolean | null; id: number }[]>();
  for (let i = 0; i < itemIds.length; i += CHUNK) {
    const slice = itemIds.slice(i, i + CHUNK);
    const { data } = await supabase
      .from('item_cost_history')
      .select('item_id, effective_date, unit_cost, tax_included, id')
      .in('item_id', slice)
      .lte('effective_date', latestMax)
      .order('effective_date', { ascending: false })
      .order('id', { ascending: false });
    const rows = (data ?? []) as {
      item_id: number;
      effective_date: string;
      unit_cost: string | null;
      tax_included: boolean | null;
      id: number;
    }[];
    for (const r of rows) {
      if (!rowsByItem.has(r.item_id)) rowsByItem.set(r.item_id, []);
      rowsByItem.get(r.item_id)!.push({
        effective_date: r.effective_date,
        unit_cost: r.unit_cost,
        tax_included: r.tax_included,
        id: r.id,
      });
    }
  }

  for (const p of pairs) {
    const key = `${p.itemId}:${p.dateStr}`;
    if (out.has(key)) continue;
    const rows = rowsByItem.get(p.itemId);
    if (!rows || rows.length === 0) {
      out.set(key, { unitCost: null, taxIncluded: null });
      continue;
    }
    const match = rows.find((r) => r.effective_date <= p.dateStr);
    if (!match || match.unit_cost == null) {
      out.set(key, { unitCost: null, taxIncluded: null });
    } else {
      out.set(key, {
        unitCost: parseFloat(match.unit_cost),
        taxIncluded: match.tax_included != null ? !!match.tax_included : null,
      });
    }
  }
  return out;
}
