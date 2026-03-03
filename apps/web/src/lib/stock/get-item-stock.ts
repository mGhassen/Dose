import type { SupabaseClient } from '@supabase/supabase-js';

export async function getItemStock(
  supabase: SupabaseClient,
  itemId: number,
  location?: string | null
): Promise<number> {
  let query = supabase
    .from('stock_levels')
    .select('quantity')
    .eq('item_id', itemId);

  if (location != null && location !== '') {
    query = query.eq('location', location);
  } else {
    query = query.is('location', null);
  }

  const { data, error } = await query.limit(1).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return 0;
    }
    throw error;
  }
  return parseFloat(data?.quantity ?? 0);
}
