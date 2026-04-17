/** Embed shape from expense_line_items / sale_line_items joins (Supabase may return object or single-element array). */
type EmbeddedItem = { id?: number; name?: string; unit?: string; unitId?: number; category?: string } | null;

export type LineWithOptionalItemEmbed = {
  itemId?: number | null;
  item?: EmbeddedItem | EmbeddedItem[] | null;
};

function normalizeEmbed(emb: EmbeddedItem | EmbeddedItem[] | null | undefined): EmbeddedItem | null {
  if (emb == null) return null;
  if (Array.isArray(emb)) return emb[0] ?? null;
  return emb;
}

/**
 * Ensures each line's `itemId` appears in the selector list with a label (from API embed when missing from paginated `items` fetch).
 */
export function mergeSelectorItemsWithLineEmbeds<T extends { id: number; name?: string }>(
  base: T[],
  lines: LineWithOptionalItemEmbed[] | null | undefined
): T[] {
  const map = new Map<number, T>(base.map((i) => [i.id, i]));
  if (!lines?.length) return base;
  for (const li of lines) {
    const id = li.itemId ?? undefined;
    if (id == null) continue;
    if (map.has(id)) continue;
    const emb = normalizeEmbed(li.item ?? null);
    const name = emb?.name?.trim() ? emb.name : `Item #${id}`;
    map.set(id, { id, ...emb, name } as T);
  }
  return Array.from(map.values());
}
