import type { BulkImportEntity } from "./constants";
import { parseIntMaybe, parseString } from "./normalize";

/**
 * Optional mappings saved in sync_jobs.bulk_review_payload and applied at import time.
 * Users can set these in the review step JSON editor.
 */
export type BulkReviewPayload = {
  /** Per staged row (source_id) shallow overrides, e.g. { "row_1": { "categoryId": 3 } } */
  bySourceId?: Record<string, Record<string, unknown>>;
  categoryNameToId?: Record<string, number>;
  unitLabelToId?: Record<string, number>;
  supplierNameToId?: Record<string, number>;
  skuToItemId?: Record<string, number>;
  itemNameToId?: Record<string, number>;
};

export function normalizeBulkReviewPayload(raw: unknown): BulkReviewPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const bySourceId = o.bySourceId;
  return {
    bySourceId:
      bySourceId && typeof bySourceId === "object" && !Array.isArray(bySourceId)
        ? (bySourceId as Record<string, Record<string, unknown>>)
        : undefined,
    categoryNameToId: asNumMap(o.categoryNameToId),
    unitLabelToId: asNumMap(o.unitLabelToId),
    supplierNameToId: asNumMap(o.supplierNameToId),
    skuToItemId: asNumMap(o.skuToItemId),
    itemNameToId: asNumMap(o.itemNameToId),
  };
}

function asNumMap(v: unknown): Record<string, number> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) {
    const n = typeof val === "number" ? val : Number(val);
    if (Number.isFinite(n)) out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

function resolveItemLine(
  line: Record<string, unknown>,
  r: BulkReviewPayload
): Record<string, unknown> {
  const li = { ...line };
  let itemId = parseIntMaybe(li.itemId);
  if (itemId == null) {
    const sku = parseString(li.itemSku as string) ?? parseString(li.item_sku as string);
    if (sku && r.skuToItemId?.[sku] != null) itemId = r.skuToItemId[sku];
  }
  if (itemId == null) {
    const nm = parseString(li.itemName as string) ?? parseString(li.item_name as string);
    if (nm && r.itemNameToId?.[nm] != null) itemId = r.itemNameToId[nm];
  }
  if (itemId != null) li.itemId = itemId;
  return li;
}

function resolveItemsEntity(p: Record<string, unknown>, r: BulkReviewPayload): Record<string, unknown> {
  const out = { ...p };
  const catName =
    parseString(out.categoryName as string) ??
    parseString(out.category as string);
  if (out.categoryId == null && catName && r.categoryNameToId?.[catName] != null) {
    out.categoryId = r.categoryNameToId[catName];
  }
  const unitLabel =
    parseString(out.unitLabel as string) ?? parseString(out.unit as string);
  if (out.unitId == null && unitLabel && r.unitLabelToId?.[unitLabel] != null) {
    out.unitId = r.unitLabelToId[unitLabel];
  }
  const supName =
    parseString(out.supplierName as string) ?? parseString(out.vendorName as string);
  if (out.vendorId == null && supName && r.supplierNameToId?.[supName] != null) {
    out.vendorId = r.supplierNameToId[supName];
  }
  return out;
}

function resolveSupplierIdOnly(p: Record<string, unknown>, r: BulkReviewPayload): Record<string, unknown> {
  const out = { ...p };
  if (out.supplierId != null) return out;
  const sn =
    parseString(out.supplierName as string) ??
    parseString(out.vendorName as string) ??
    parseString(out.lender as string) ??
    parseString(out.lessor as string);
  if (sn && r.supplierNameToId?.[sn] != null) {
    out.supplierId = r.supplierNameToId[sn];
  }
  return out;
}

export function applyBulkReviewToRow(
  entity: BulkImportEntity,
  sourceId: string,
  payload: Record<string, unknown>,
  review: BulkReviewPayload
): Record<string, unknown> {
  let p = { ...payload };
  const sid = review.bySourceId?.[sourceId];
  if (sid && typeof sid === "object") {
    p = { ...p, ...sid };
  }

  switch (entity) {
    case "items":
      return resolveItemsEntity(p, review);
    case "recipe": {
      const items = (p as { items?: unknown }).items;
      if (Array.isArray(items)) {
        return {
          ...p,
          items: items.map((line) =>
            line && typeof line === "object"
              ? resolveItemLine(line as Record<string, unknown>, review)
              : line
          ),
        };
      }
      return p;
    }
    case "supplier_orders": {
      let out = resolveSupplierIdOnly(p, review) as Record<string, unknown>;
      const items = out.items;
      if (Array.isArray(items)) {
        out = {
          ...out,
          items: items.map((line) =>
            line && typeof line === "object"
              ? resolveItemLine(line as Record<string, unknown>, review)
              : line
          ),
        };
      }
      return out;
    }
    case "sales": {
      const lineItems = (p as { lineItems?: unknown }).lineItems;
      if (Array.isArray(lineItems)) {
        return {
          ...p,
          lineItems: lineItems.map((line) =>
            line && typeof line === "object"
              ? resolveItemLine(line as Record<string, unknown>, review)
              : line
          ),
        };
      }
      return p;
    }
    case "stock_movements": {
      const out = { ...p };
      let itemId = parseIntMaybe(out.itemId);
      if (itemId == null) {
        const sku = parseString(out.itemSku as string);
        if (sku && review.skuToItemId?.[sku] != null) itemId = review.skuToItemId[sku];
      }
      if (itemId == null) {
        const nm = parseString(out.itemName as string);
        if (nm && review.itemNameToId?.[nm] != null) itemId = review.itemNameToId[nm];
      }
      if (itemId != null) out.itemId = itemId;
      return out;
    }
    case "expenses":
    case "subscriptions":
    case "loans":
    case "leasing":
      return resolveSupplierIdOnly(p, review);
    default:
      return p;
  }
}
