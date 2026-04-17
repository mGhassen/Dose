/** Embed shape from expense_line_items / sale_line_items joins (Supabase may return object or single-element array). */
type EmbeddedItem = { id?: number; name?: string; unit?: string; unitId?: number } | null;

export type LineWithOptionalItemEmbed = {
  itemId?: number | string | null;
  /** Snake_case when line objects are still raw from PostgREST */
  item_id?: number | string | null;
  item?: EmbeddedItem | EmbeddedItem[] | null;
};

export function toPositiveItemId(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.trunc(n);
}

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
  const map = new Map<number, T>(base.map((i) => [Number(i.id), i]));
  if (!lines?.length) return base;
  for (const li of lines) {
    const id =
      toPositiveItemId(li.itemId) ??
      toPositiveItemId(li.item_id) ??
      toPositiveItemId(normalizeEmbed(li.item ?? null)?.id);
    if (id == null) continue;
    if (map.has(id)) continue;
    const emb = normalizeEmbed(li.item ?? null);
    const name = emb?.name?.trim() ? emb.name : `Item #${id}`;
    map.set(id, { ...emb, id, name } as T);
  }
  return Array.from(map.values());
}
