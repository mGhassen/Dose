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
  unitCost: number
): Promise<void> {
  const { error } = await supabase
    .from('item_cost_history')
    .insert({ item_id: itemId, effective_date: effectiveDate, unit_cost: unitCost });
  if (error) throw error;
}
