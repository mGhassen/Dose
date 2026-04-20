/**
 * Resolve item selling price or cost as of a given date from history tables only.
 */

import { resolveCanonicalItemIdForCost } from '@/lib/items/group-members';
import { loadUnitConversionContext } from '@/lib/units/context';
import { convertUnitPriceWithContextOrFactorFallback } from '@/lib/units/convert';

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

/** Raw `item_cost_history` line: `amount` is the stored total for `basisQuantity` of `unitId`. */
export type ItemCostHistoryQuote = {
  amount: number;
  basisQuantity: number;
  unitId: number | null;
};

export interface ItemCostAsOf {
  unitCost: number | null;
  taxIncluded: boolean | null;
  /** Unit variable id: returned `unit_cost` is money per this unit (the requesting item's unit when grouped). */
  unitId: number | null;
  /**
   * Always 1 when `unitCost` is set: rate is per one of `unitId`.
   * (Storage may use `cost_basis_quantity` on the row; we normalize to €/1 before converting units.)
   */
  basisQuantity: number | null;
  /** Present when `unitCost` came from history: original DB line before normalization. */
  historyQuote: ItemCostHistoryQuote | null;
}

/**
 * Cost history is stored on the merged group's canonical item; the returned values are converted
 * into the requesting `itemId`'s inventory unit when it differs from the canonical row.
 */
export async function getItemCostAsOf(
  supabase: { from: (t: string) => any },
  itemId: number,
  dateStr: string
): Promise<ItemCostAsOf> {
  const canonicalId = await resolveCanonicalItemIdForCost(supabase, itemId);
  const { data: historyRow } = await supabase
    .from('item_cost_history')
    .select('unit_cost, tax_included, unit_id, cost_basis_quantity')
    .eq('item_id', canonicalId)
    .lte('effective_date', dateStr)
    .order('effective_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyRow?.unit_cost == null) {
    return {
      unitCost: null,
      taxIncluded: null,
      unitId: null,
      basisQuantity: null,
      historyQuote: null,
    };
  }

  const [{ data: requesterRow }, { data: canonicalRow }] = await Promise.all([
    supabase.from('items').select('unit_id').eq('id', itemId).maybeSingle(),
    supabase.from('items').select('unit_id').eq('id', canonicalId).maybeSingle(),
  ]);

  const basisRaw = (historyRow as { cost_basis_quantity?: string | number | null }).cost_basis_quantity;
  const basisQty = Math.max(Number(basisRaw != null ? basisRaw : 1) || 1, 1e-12);
  const rawLineAmount = parseFloat(historyRow.unit_cost);
  let unitCost = rawLineAmount / basisQty;
  const histUid = historyRow.unit_id as number | null | undefined;
  const fromUnit = histUid != null ? Number(histUid) : (canonicalRow?.unit_id as number | null) ?? null;
  const historyQuote: ItemCostHistoryQuote = {
    amount: rawLineAmount,
    basisQuantity: basisQty,
    unitId: fromUnit,
  };
  const toUnit = (requesterRow?.unit_id as number | null) ?? null;

  let outUnitId: number | null = toUnit ?? fromUnit;

  if (fromUnit != null && toUnit != null && fromUnit !== toUnit) {
    const ctx = await loadUnitConversionContext(supabase);
    const priceResult = convertUnitPriceWithContextOrFactorFallback(unitCost, fromUnit, toUnit, ctx);
    unitCost = priceResult.unitPrice;
    outUnitId = toUnit;
  }

  return {
    unitCost,
    taxIncluded: historyRow.tax_included != null ? !!historyRow.tax_included : null,
    unitId: outUnitId,
    basisQuantity: 1,
    historyQuote,
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

  const uniqueItemIds = [...new Set(pairs.map((p) => p.itemId))];
  const canonicalByItem = new Map<number, number>();
  for (const id of uniqueItemIds) {
    canonicalByItem.set(id, await resolveCanonicalItemIdForCost(supabase, id));
  }
  const uniqueCanonicalIds = [...new Set(Array.from(canonicalByItem.values()))];

  const maxDateByCanonical = new Map<number, string>();
  for (const p of pairs) {
    const c = canonicalByItem.get(p.itemId)!;
    const cur = maxDateByCanonical.get(c);
    if (!cur || p.dateStr > cur) maxDateByCanonical.set(c, p.dateStr);
  }
  const latestMax = Array.from(maxDateByCanonical.values()).reduce((a, b) => (a > b ? a : b), '');

  const CHUNK = 500;
  const rowsByCanonical = new Map<
    number,
    {
      effective_date: string;
      unit_cost: string | null;
      tax_included: boolean | null;
      unit_id: number | null;
      cost_basis_quantity: string | number | null;
      id: number;
    }[]
  >();
  for (let i = 0; i < uniqueCanonicalIds.length; i += CHUNK) {
    const slice = uniqueCanonicalIds.slice(i, i + CHUNK);
    const { data } = await supabase
      .from('item_cost_history')
      .select('item_id, effective_date, unit_cost, tax_included, unit_id, cost_basis_quantity, id')
      .in('item_id', slice)
      .lte('effective_date', latestMax)
      .order('effective_date', { ascending: false })
      .order('id', { ascending: false });
    const rows = (data ?? []) as {
      item_id: number;
      effective_date: string;
      unit_cost: string | null;
      tax_included: boolean | null;
      unit_id: number | null;
      cost_basis_quantity: string | number | null;
      id: number;
    }[];
    for (const r of rows) {
      if (!rowsByCanonical.has(r.item_id)) rowsByCanonical.set(r.item_id, []);
      rowsByCanonical.get(r.item_id)!.push({
        effective_date: r.effective_date,
        unit_cost: r.unit_cost,
        tax_included: r.tax_included,
        unit_id: r.unit_id,
        cost_basis_quantity: r.cost_basis_quantity,
        id: r.id,
      });
    }
  }

  const allIdsForUnits = [...new Set([...uniqueItemIds, ...uniqueCanonicalIds])];
  const { data: unitRows } = await supabase.from('items').select('id, unit_id').in('id', allIdsForUnits);
  const unitByItemId = new Map<number, number | null>();
  for (const r of unitRows || []) {
    unitByItemId.set((r as { id: number }).id, (r as { unit_id: number | null }).unit_id ?? null);
  }

  const ctx = await loadUnitConversionContext(supabase);

  for (const p of pairs) {
    const key = `${p.itemId}:${p.dateStr}`;
    if (out.has(key)) continue;
    const canonicalId = canonicalByItem.get(p.itemId)!;
    const rows = rowsByCanonical.get(canonicalId);
    if (!rows || rows.length === 0) {
      out.set(key, {
        unitCost: null,
        taxIncluded: null,
        unitId: null,
        basisQuantity: null,
        historyQuote: null,
      });
      continue;
    }
    const match = rows.find((r) => r.effective_date <= p.dateStr);
    if (!match || match.unit_cost == null) {
      out.set(key, {
        unitCost: null,
        taxIncluded: null,
        unitId: null,
        basisQuantity: null,
        historyQuote: null,
      });
      continue;
    }

    const bq = Math.max(Number(match.cost_basis_quantity != null ? match.cost_basis_quantity : 1) || 1, 1e-12);
    const rawLineAmount = parseFloat(match.unit_cost);
    let unitCost = rawLineAmount / bq;
    const fromUnit =
      match.unit_id != null ? Number(match.unit_id) : (unitByItemId.get(canonicalId) ?? null);
    const toUnit = unitByItemId.get(p.itemId) ?? null;

    let outUnitId: number | null = toUnit ?? fromUnit;

    if (fromUnit != null && toUnit != null && fromUnit !== toUnit) {
      const priceResult = convertUnitPriceWithContextOrFactorFallback(unitCost, fromUnit, toUnit, ctx);
      unitCost = priceResult.unitPrice;
      outUnitId = toUnit;
    }

    const quoteUnitId =
      match.unit_id != null ? Number(match.unit_id) : (unitByItemId.get(canonicalId) ?? null);
    const historyQuote: ItemCostHistoryQuote = {
      amount: rawLineAmount,
      basisQuantity: bq,
      unitId: quoteUnitId,
    };

    out.set(key, {
      unitCost,
      taxIncluded: match.tax_included != null ? !!match.tax_included : null,
      unitId: outUnitId ?? (match.unit_id != null ? Number(match.unit_id) : null),
      basisQuantity: 1,
      historyQuote,
    });
  }
  return out;
}
