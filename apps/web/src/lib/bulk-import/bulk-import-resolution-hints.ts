import type { SupabaseClient } from "@supabase/supabase-js";
import type { BulkImportEntity } from "./constants";
import type { BulkReviewPayload } from "./apply-review-payload";
import { parseIntMaybe, parseString } from "./normalize";

const MAX_PAYLOADS_FOR_HINTS = 8000;
const MAX_ITEM_NAME_QUERIES = 80;

export type ItemNameCandidate = { id: number; name: string; sku: string | null };

export type BulkResolutionHints = {
  suggested_payload: BulkReviewPayload;
  unresolved: {
    categoryNames: string[];
    unitLabels: string[];
    supplierNames: string[];
    skus: string[];
    itemNames: string[];
  };
  ambiguous_item_names: Record<string, ItemNameCandidate[]>;
};

function add<T>(set: Set<T>, v: T | undefined | null) {
  if (v !== undefined && v !== null && String(v).trim() !== "") set.add(v as T);
}

function collectItemLine(
  line: Record<string, unknown>,
  cats: Set<string>,
  units: Set<string>,
  sups: Set<string>,
  skus: Set<string>,
  inames: Set<string>
) {
  if (parseIntMaybe(line.itemId) == null) {
    add(skus, parseString(line.itemSku as string) ?? parseString(line.item_sku as string));
    add(inames, parseString(line.itemName as string) ?? parseString(line.item_name as string));
  }
  if (parseIntMaybe(line.unitId as number) == null) {
    add(units, parseString(line.unit as string) ?? parseString(line.unitLabel as string));
  }
}

function collectFromPayload(
  entity: BulkImportEntity,
  p: Record<string, unknown>,
  cats: Set<string>,
  units: Set<string>,
  sups: Set<string>,
  skus: Set<string>,
  inames: Set<string>
) {
  switch (entity) {
    case "items": {
      if (parseIntMaybe(p.categoryId) == null) {
        add(
          cats,
          parseString(p.categoryName as string) ??
            parseString(p.category as string) ??
            parseString(p.category_name as string)
        );
      }
      if (parseIntMaybe(p.unitId) == null) {
        add(
          units,
          parseString(p.unitLabel as string) ??
            parseString(p.unit as string) ??
            parseString(p.unit_label as string)
        );
      }
      if (parseIntMaybe(p.vendorId) == null) {
        add(
          sups,
          parseString(p.supplierName as string) ??
            parseString(p.vendorName as string) ??
            parseString(p.supplier_name as string)
        );
      }
      break;
    }
    case "recipe": {
      const items = (p as { items?: unknown }).items;
      if (Array.isArray(items)) {
        for (const line of items) {
          if (line && typeof line === "object") {
            collectItemLine(line as Record<string, unknown>, cats, units, sups, skus, inames);
          }
        }
      }
      break;
    }
    case "supplier_orders": {
      if (parseIntMaybe(p.supplierId) == null) {
        add(sups, parseString(p.supplierName as string));
      }
      const items = (p as { items?: unknown }).items;
      if (Array.isArray(items)) {
        for (const line of items) {
          if (line && typeof line === "object") {
            collectItemLine(line as Record<string, unknown>, cats, units, sups, skus, inames);
          }
        }
      }
      break;
    }
    case "sales": {
      const lineItems = (p as { lineItems?: unknown }).lineItems;
      if (Array.isArray(lineItems)) {
        for (const line of lineItems) {
          if (line && typeof line === "object") {
            collectItemLine(line as Record<string, unknown>, cats, units, sups, skus, inames);
          }
        }
      }
      break;
    }
    case "stock_movements": {
      if (parseIntMaybe(p.itemId) == null) {
        add(skus, parseString(p.itemSku as string));
        add(inames, parseString(p.itemName as string));
      }
      if (parseIntMaybe(p.unitId as number) == null) {
        add(units, parseString(p.unit as string));
      }
      break;
    }
    case "expenses":
    case "subscriptions":
    case "loans":
    case "leasing": {
      if (parseIntMaybe(p.supplierId) == null) {
        add(
          sups,
          parseString(p.supplierName as string) ??
            parseString(p.vendorName as string) ??
            parseString(p.lender as string) ??
            parseString(p.lessor as string)
        );
      }
      break;
    }
    default:
      break;
  }
}

export async function buildBulkResolutionHints(
  supabase: SupabaseClient,
  entity: BulkImportEntity,
  payloads: Record<string, unknown>[]
): Promise<BulkResolutionHints> {
  const cats = new Set<string>();
  const units = new Set<string>();
  const sups = new Set<string>();
  const skus = new Set<string>();
  const inames = new Set<string>();

  const slice = payloads.slice(0, MAX_PAYLOADS_FOR_HINTS);
  for (const raw of slice) {
    collectFromPayload(entity, raw, cats, units, sups, skus, inames);
  }

  const suggested: BulkReviewPayload = {};
  const unresolved = {
    categoryNames: [] as string[],
    unitLabels: [] as string[],
    supplierNames: [] as string[],
    skus: [] as string[],
    itemNames: [] as string[],
  };
  const ambiguous_item_names: Record<string, ItemNameCandidate[]> = {};

  const categoryNameToId: Record<string, number> = {};
  if (cats.size > 0) {
    const { data: catRows } = await supabase
      .from("item_categories")
      .select("id, name, label")
      .eq("is_active", true);
    const byName = new Map<string, { id: number; name: string }>();
    for (const c of catRows || []) {
      const row = c as { id: number; name: string; label: string };
      byName.set(row.name.trim().toLowerCase(), { id: row.id, name: row.name });
      byName.set(row.label.trim().toLowerCase(), { id: row.id, name: row.name });
    }
    for (const cand of cats) {
      const hit = byName.get(cand.trim().toLowerCase());
      if (hit) categoryNameToId[cand] = hit.id;
      else unresolved.categoryNames.push(cand);
    }
    if (Object.keys(categoryNameToId).length) suggested.categoryNameToId = categoryNameToId;
  }

  const unitLabelToId: Record<string, number> = {};
  if (units.size > 0) {
    const { data: unitRows } = await supabase
      .from("variables")
      .select("id, name, payload")
      .eq("type", "unit")
      .eq("is_active", true);
    const matchers: { id: number; keys: Set<string> }[] = [];
    for (const u of unitRows || []) {
      const row = u as { id: number; name: string; payload: unknown };
      const keys = new Set<string>();
      keys.add(row.name.trim().toLowerCase());
      const payload = row.payload as { symbol?: string; label?: string } | null;
      if (payload?.symbol) keys.add(String(payload.symbol).trim().toLowerCase());
      if (payload?.label) keys.add(String(payload.label).trim().toLowerCase());
      matchers.push({ id: row.id, keys });
    }
    for (const cand of units) {
      const k = cand.trim().toLowerCase();
      const hits = matchers.filter((m) => m.keys.has(k));
      if (hits.length === 1) unitLabelToId[cand] = hits[0]!.id;
      else if (hits.length === 0) unresolved.unitLabels.push(cand);
    }
    if (Object.keys(unitLabelToId).length) suggested.unitLabelToId = unitLabelToId;
  }

  const supplierNameToId: Record<string, number> = {};
  if (sups.size > 0) {
    const { data: supRows } = await supabase.from("suppliers").select("id, name").eq("is_active", true);
    const byLower = new Map<string, { id: number; name: string }>();
    for (const s of supRows || []) {
      const row = s as { id: number; name: string };
      byLower.set(row.name.trim().toLowerCase(), { id: row.id, name: row.name });
    }
    for (const cand of sups) {
      const hit = byLower.get(cand.trim().toLowerCase());
      if (hit) supplierNameToId[cand] = hit.id;
      else unresolved.supplierNames.push(cand);
    }
    if (Object.keys(supplierNameToId).length) suggested.supplierNameToId = supplierNameToId;
  }

  const skuToItemId: Record<string, number> = {};
  const skuList = [...skus].filter(Boolean);
  if (skuList.length > 0) {
    const { data: skuRows } = await supabase.from("items").select("id, sku").in("sku", skuList);
    const seen = new Set<string>();
    for (const r of skuRows || []) {
      const row = r as { id: number; sku: string | null };
      if (row.sku) {
        skuToItemId[row.sku] = row.id;
        seen.add(row.sku);
      }
    }
    for (const s of skuList) {
      if (!seen.has(s)) unresolved.skus.push(s);
    }
    if (Object.keys(skuToItemId).length) suggested.skuToItemId = skuToItemId;
  }

  const itemNameToId: Record<string, number> = {};
  const nameList = [...inames].filter(Boolean);
  if (nameList.length > 0) {
    const unique = [...new Set(nameList)];
    const toQuery = unique.slice(0, MAX_ITEM_NAME_QUERIES);

    for (const nm of toQuery) {
      const { data: rows } = await supabase.from("items").select("id, sku, name").ilike("name", nm);
      const list = (rows || []) as ItemNameCandidate[];
      const exact = list.filter((r) => r.name.trim().toLowerCase() === nm.trim().toLowerCase());
      if (exact.length === 1) {
        itemNameToId[nm] = exact[0]!.id;
      } else if (exact.length > 1) {
        ambiguous_item_names[nm] = exact;
      } else {
        unresolved.itemNames.push(nm);
      }
    }
    if (unique.length > MAX_ITEM_NAME_QUERIES) {
      for (const nm of unique.slice(MAX_ITEM_NAME_QUERIES)) {
        unresolved.itemNames.push(nm);
      }
    }
    if (Object.keys(itemNameToId).length) suggested.itemNameToId = itemNameToId;
  }

  return {
    suggested_payload: suggested,
    unresolved,
    ambiguous_item_names,
  };
}

export function mergeSuggestedReviewPayload(
  current: Record<string, unknown>,
  suggested: BulkReviewPayload
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...current };
  const mapKeys = [
    "categoryNameToId",
    "unitLabelToId",
    "supplierNameToId",
    "skuToItemId",
    "itemNameToId",
  ] as const;
  for (const key of mapKeys) {
    const cur = (out[key] as Record<string, number> | undefined) || {};
    const sug = suggested[key] || {};
    const merged = { ...cur, ...sug };
    if (Object.keys(merged).length) out[key] = merged;
  }
  if (suggested.bySourceId && Object.keys(suggested.bySourceId).length) {
    out.bySourceId = {
      ...((out.bySourceId as object) || {}),
      ...suggested.bySourceId,
    };
  }
  return out;
}
