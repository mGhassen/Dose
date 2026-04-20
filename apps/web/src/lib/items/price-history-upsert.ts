/**
 * Upsert a price history entry for an item on a given date.
 * Used so sales (and other flows) can set/override price in one place (history).
 */

type SupabaseClient = { from: (table: string) => any };

export async function upsertSellingPrice(
  supabase: SupabaseClient,
  itemId: number,
  effectiveDate: string,
  unitPrice: number,
  taxIncluded?: boolean
): Promise<void> {
  const payload: Record<string, unknown> = { item_id: itemId, effective_date: effectiveDate, unit_price: unitPrice };
  if (taxIncluded !== undefined) payload.tax_included = taxIncluded;
  const { error } = await supabase
    .from('item_selling_price_history')
    .upsert(payload, { onConflict: 'item_id,effective_date' });
  if (error) throw error;
}

export async function upsertCost(
  supabase: SupabaseClient,
  itemId: number,
  effectiveDate: string,
  unitCost: number,
  taxIncluded: boolean,
  /** Cost is per this unit; if omitted, uses `items.unit_id` for `itemId`. */
  unitId?: number | null,
  /** How many of `unitId` the line total `unitCost` refers to (default 1). */
  costBasisQuantity?: number
): Promise<void> {
  let resolvedUnitId: number | null | undefined = unitId;
  if (resolvedUnitId === undefined) {
    const { data } = await supabase.from("items").select("unit_id").eq("id", itemId).maybeSingle();
    resolvedUnitId = data?.unit_id ?? null;
  }
  const payload: Record<string, unknown> = {
    item_id: itemId,
    effective_date: effectiveDate,
    unit_cost: unitCost,
    tax_included: taxIncluded,
    unit_id: resolvedUnitId ?? null,
    cost_basis_quantity:
      costBasisQuantity != null && costBasisQuantity > 0 ? costBasisQuantity : 1,
  };
  const { error } = await supabase.from("item_cost_history").insert(payload);
  if (error) throw error;
}
