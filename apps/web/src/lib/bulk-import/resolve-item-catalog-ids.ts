import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIntMaybe, parseString } from "./normalize";

export type ItemCatalogLookups = {
  categoryByLower: Map<string, number>;
  unitMatchers: { id: number; keys: Set<string> }[];
  supplierByLower: Map<string, number>;
};

/** Load once per bulk job; used to resolve semantic names to IDs for items. */
export async function loadItemCatalogLookups(supabase: SupabaseClient): Promise<ItemCatalogLookups> {
  const categoryByLower = new Map<string, number>();
  const { data: catRows } = await supabase
    .from("item_categories")
    .select("id, name, label")
    .eq("is_active", true);
  for (const c of catRows || []) {
    const row = c as { id: number; name: string; label: string };
    categoryByLower.set(row.name.trim().toLowerCase(), row.id);
    categoryByLower.set(row.label.trim().toLowerCase(), row.id);
  }

  const unitMatchers: { id: number; keys: Set<string> }[] = [];
  const { data: unitRows } = await supabase
    .from("variables")
    .select("id, name, payload")
    .eq("type", "unit")
    .eq("is_active", true);
  for (const u of unitRows || []) {
    const row = u as { id: number; name: string; payload: unknown };
    const keys = new Set<string>();
    keys.add(row.name.trim().toLowerCase());
    const payload = row.payload as { symbol?: string; label?: string } | null;
    if (payload?.symbol) keys.add(String(payload.symbol).trim().toLowerCase());
    if (payload?.label) keys.add(String(payload.label).trim().toLowerCase());
    unitMatchers.push({ id: row.id, keys });
  }

  const supplierByLower = new Map<string, number>();
  const { data: supRows } = await supabase.from("suppliers").select("id, name").eq("is_active", true);
  for (const s of supRows || []) {
    const row = s as { id: number; name: string };
    supplierByLower.set(row.name.trim().toLowerCase(), row.id);
  }

  return { categoryByLower, unitMatchers, supplierByLower };
}

/**
 * Fills categoryId, unitId, vendorId from semantic fields when IDs are absent.
 * Legacy columns category_id / unit_id / vendor_id (camelCase) still win when set.
 */
export function resolveItemPayloadWithCatalog(
  p: Record<string, unknown>,
  lookups: ItemCatalogLookups
): Record<string, unknown> {
  const out = { ...p };

  if (parseIntMaybe(out.categoryId) == null) {
    const catStr =
      parseString(out.categoryName as string) ??
      parseString(out.category as string) ??
      parseString(out.category_name as string);
    if (catStr) {
      const id = lookups.categoryByLower.get(catStr.trim().toLowerCase());
      if (id == null) {
        throw new Error(`Unknown item category: "${catStr}"`);
      }
      out.categoryId = id;
    }
  }

  if (parseIntMaybe(out.unitId) == null) {
    const unitStr =
      parseString(out.unitLabel as string) ??
      parseString(out.unit as string) ??
      parseString(out.unit_label as string);
    if (unitStr) {
      const k = unitStr.trim().toLowerCase();
      const hits = lookups.unitMatchers.filter((m) => m.keys.has(k));
      if (hits.length === 1) {
        out.unitId = hits[0]!.id;
      } else if (hits.length === 0) {
        throw new Error(`Unknown unit label: "${unitStr}"`);
      } else {
        throw new Error(`Ambiguous unit label "${unitStr}": matches multiple catalog units`);
      }
    }
  }

  if (parseIntMaybe(out.vendorId) == null) {
    const supStr =
      parseString(out.supplierName as string) ??
      parseString(out.vendorName as string) ??
      parseString(out.supplier_name as string);
    if (supStr) {
      const id = lookups.supplierByLower.get(supStr.trim().toLowerCase());
      if (id == null) {
        throw new Error(`Unknown supplier: "${supStr}"`);
      }
      out.vendorId = id;
    }
  }

  return out;
}
