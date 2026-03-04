/**
 * Upsert a price history entry for an item on a given date.
 * Used so sales (and other flows) can set/override price in one place (history).
 */

type SupabaseClient = { from: (table: string) => any };

export async function upsertSellingPrice(
  supabase: SupabaseClient,
  itemId: number,
  effectiveDate: string,
  unitPrice: number
): Promise<void> {
  const { error } = await supabase
    .from('item_selling_price_history')
    .upsert(
      { item_id: itemId, effective_date: effectiveDate, unit_price: unitPrice },
      { onConflict: 'item_id,effective_date' }
    );
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
    .upsert(
      { item_id: itemId, effective_date: effectiveDate, unit_cost: unitCost },
      { onConflict: 'item_id,effective_date' }
    );
  if (error) throw error;
  await supabase.from('items').update({ unit_cost: null }).eq('id', itemId);
}
