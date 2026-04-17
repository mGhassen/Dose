import type { ExpenseLineItem } from '@kit/types';

/**
 * Mirrors sales GET: load `item.id` + `item.name` with a plain `items` query.
 * Avoids relying on PostgREST embeds (e.g. stale `items.unit` in select breaks the whole nested `item`).
 */
export async function hydrateExpenseLineItemItems(
  supabase: any,
  lineItems: ExpenseLineItem[]
): Promise<ExpenseLineItem[]> {
  const itemIds = [
    ...new Set(
      lineItems
        .map((l) => l.itemId)
        .filter((id): id is number => id != null)
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (itemIds.length === 0) return lineItems;

  const { data } = await supabase.from('items').select('id, name').in('id', itemIds);
  const rows = (data || []) as { id: number; name: string }[];
  const map = new Map<number, { id: number; name: string }>(
    rows.map((row) => [Number(row.id), { id: Number(row.id), name: row.name }])
  );

  return lineItems.map((line) => {
    if (line.itemId == null) return line;
    const hit = map.get(Number(line.itemId));
    if (!hit) return line;
    return { ...line, item: { id: hit.id, name: hit.name } as ExpenseLineItem['item'] };
  });
}
