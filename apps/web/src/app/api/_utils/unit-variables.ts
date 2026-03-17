import type { SupabaseClient } from '@supabase/supabase-js';

type UnitVariable = { symbol: string; name?: string };

export async function getUnitVariableMap(
  supabase: SupabaseClient,
  unitIds: Array<number | null | undefined>
): Promise<Map<number, UnitVariable>> {
  const ids = [...new Set(unitIds.filter((id): id is number => typeof id === 'number'))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('variables')
    .select('id, name, payload')
    .eq('type', 'unit')
    .in('id', ids);

  if (error) throw error;

  const map = new Map<number, UnitVariable>();
  for (const row of data || []) {
    const payload = (row as any).payload || {};
    const symbol = (payload.symbol as string) ?? '';
    map.set((row as any).id, { symbol, name: (row as any).name });
  }
  return map;
}

