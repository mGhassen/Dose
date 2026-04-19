import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { BulkImportEntity } from "./constants";
import { parseBool, parseIntMaybe, parseNumber, parseString, rowKeysToCamel } from "./normalize";

export type StagedBulkRow = { source_id: string; payload: Record<string, unknown> };

function isXlsx(filename: string, contentType?: string): boolean {
  const lower = filename.toLowerCase();
  return (
    contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lower.endsWith(".xlsx")
  );
}

function jsonRows(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
}

function groupBy<T>(rows: T[], keyFn: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

export function parseBulkImportFile(
  entity: BulkImportEntity,
  buffer: ArrayBuffer,
  filename: string,
  contentType?: string
): StagedBulkRow[] {
  if (isXlsx(filename, contentType)) {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    return parseXlsx(entity, wb);
  }
  const text = new TextDecoder("utf-8").decode(buffer);
  const res = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const rows = (Array.isArray(res.data) ? res.data : []).map((r) => rowKeysToCamel(r));
  return parseFlatRows(entity, rows);
}

function findSheet(wb: XLSX.WorkBook, name: string): XLSX.WorkSheet | null {
  const n = name.toLowerCase();
  const sn = wb.SheetNames.find((s) => s.toLowerCase() === n);
  return sn ? wb.Sheets[sn]! : null;
}

function parseXlsx(entity: BulkImportEntity, wb: XLSX.WorkBook): StagedBulkRow[] {
  if (entity === "recipe") {
    const recipesWs = findSheet(wb, "recipes");
    const itemsWs = findSheet(wb, "recipe_items");
    if (recipesWs && itemsWs) {
      const recipeRows = jsonRows(recipesWs).map((r) => rowKeysToCamel(r));
      const itemRows = jsonRows(itemsWs).map((r) => rowKeysToCamel(r));
      const byRecipe = new Map<string, Record<string, unknown>[]>();
      for (const ir of itemRows) {
        const rn = parseString(ir.recipeName) ?? parseString((ir as { recipe_name?: unknown }).recipe_name);
        if (!rn) continue;
        if (!byRecipe.has(rn)) byRecipe.set(rn, []);
        byRecipe.get(rn)!.push(ir);
      }
      const out: StagedBulkRow[] = [];
      let i = 0;
      for (const rr of recipeRows) {
        const name = parseString(rr.name);
        if (!name) continue;
        i += 1;
        const lines = byRecipe.get(name) ?? [];
        const items = lines.map((line) => ({
          itemId: parseIntMaybe(line.itemId) ?? parseIntMaybe(line.item_id),
          quantity: parseNumber(line.quantity) ?? 0,
          unit: parseString(line.unit),
          unitId: parseIntMaybe(line.unitId) ?? parseIntMaybe(line.unit_id),
          notes: parseString(line.notes),
        })).filter((it) => it.itemId != null && it.quantity > 0);
        out.push({
          source_id: `recipe_${i}_${name}`,
          payload: {
            name,
            description: parseString(rr.description),
            unitId: parseIntMaybe(rr.unitId),
            unit: parseString(rr.unit),
            category: parseString(rr.category),
            servingSize: parseIntMaybe(rr.servingSize),
            preparationTime: parseIntMaybe(rr.preparationTime),
            cookingTime: parseIntMaybe(rr.cookingTime),
            instructions: parseString(rr.instructions),
            notes: parseString(rr.notes),
            isActive: parseBool(rr.isActive) ?? true,
            producedItemId: parseIntMaybe(rr.producedItemId),
            items: items.length > 0 ? items : undefined,
          },
        });
      }
      return out;
    }
  }

  if (entity === "supplier_orders") {
    const ordersWs = findSheet(wb, "orders");
    const linesWs = findSheet(wb, "order_lines");
    if (ordersWs && linesWs) {
      const orderRows = jsonRows(ordersWs).map((r) => rowKeysToCamel(r));
      const lineRows = jsonRows(linesWs).map((r) => rowKeysToCamel(r));
      const linesByOrder = new Map<string, Record<string, unknown>[]>();
      for (const lr of lineRows) {
        const onum =
          parseString(lr.orderNumber) ??
          parseString((lr as { order_number?: unknown }).order_number);
        if (!onum) continue;
        if (!linesByOrder.has(onum)) linesByOrder.set(onum, []);
        linesByOrder.get(onum)!.push(lr);
      }
      const out: StagedBulkRow[] = [];
      let i = 0;
      for (const orow of orderRows) {
        const orderNumber = parseString(orow.orderNumber) ?? parseString((orow as { order_number?: unknown }).order_number);
        if (!orderNumber) continue;
        i += 1;
        const supplierId = parseIntMaybe(orow.supplierId) ?? parseIntMaybe((orow as { supplier_id?: unknown }).supplier_id);
        if (supplierId == null) continue;
        const lr = linesByOrder.get(orderNumber) ?? [];
        const items = lr.map((line) => ({
          itemId: parseIntMaybe(line.itemId) ?? parseIntMaybe(line.item_id),
          quantity: parseNumber(line.quantity) ?? 0,
          unit: parseString(line.unit) ?? "",
          unitId: parseIntMaybe(line.unitId),
          unitPrice: parseNumber(line.unitPrice) ?? parseNumber(line.unit_price) ?? 0,
          taxRatePercent: parseNumber(line.taxRatePercent) ?? parseNumber(line.tax_rate_percent),
          taxInclusive: parseBool(line.taxInclusive) ?? parseBool(line.tax_inclusive),
          notes: parseString(line.notes),
        })).filter((it) => it.itemId != null && it.quantity > 0);
        if (items.length === 0) continue;
        out.push({
          source_id: `supplier_order_${i}_${orderNumber}`,
          payload: {
            supplierId,
            orderNumber,
            orderDate: parseString(orow.orderDate) ?? parseString(orow.order_date),
            expectedDeliveryDate: parseString(orow.expectedDeliveryDate) ?? parseString(orow.expected_delivery_date),
            status: parseString(orow.status) ?? "pending",
            notes: parseString(orow.notes),
            items,
          },
        });
      }
      return out;
    }
  }

  const sheetName = wb.SheetNames[0];
  const ws = sheetName ? wb.Sheets[sheetName] : null;
  if (!ws) return [];
  const rows = jsonRows(ws).map((r) => rowKeysToCamel(r));
  return parseFlatRows(entity, rows);
}

function parseFlatRows(entity: BulkImportEntity, rows: Record<string, unknown>[]): StagedBulkRow[] {
  if (entity === "sales") {
    const groups = groupBy(rows, (r) => parseString(r.saleGroupId) ?? parseString((r as { sale_group_id?: unknown }).sale_group_id) ?? "");
    const out: StagedBulkRow[] = [];
    let gi = 0;
    for (const [gid, grows] of groups) {
      if (!gid) continue;
      gi += 1;
      const first = grows[0]!;
      const date = parseString(first.date) ?? "";
      const type = parseString(first.type) ?? "other";
      const description = parseString(first.description);
      const lineItems = grows.map((r) => ({
        itemId: parseIntMaybe(r.itemId),
        quantity: parseNumber(r.quantity) ?? 0,
        unitId: parseIntMaybe(r.unitId),
        unitPrice: parseNumber(r.unitPrice) ?? 0,
        unitCost: parseNumber(r.unitCost),
        taxRatePercent: parseNumber(r.taxRatePercent),
        parentLineIndex: parseIntMaybe(r.parentLineIndex),
      })).filter((l) => l.quantity > 0);
      out.push({
        source_id: `sale_${gi}_${gid}`,
        payload: { date, type, description, lineItems },
      });
    }
    return out;
  }

  if (entity === "supplier_orders") {
    const groups = groupBy(rows, (r) => parseString(r.orderKey) ?? parseString((r as { order_key?: unknown }).order_key) ?? "");
    const out: StagedBulkRow[] = [];
    let gi = 0;
    for (const [ok, grows] of groups) {
      if (!ok) continue;
      gi += 1;
      const first = grows[0]!;
      const supplierId = parseIntMaybe(first.supplierId) ?? parseIntMaybe((first as { supplier_id?: unknown }).supplier_id);
      if (supplierId == null) continue;
      const items = grows.map((r) => ({
        itemId: parseIntMaybe(r.itemId) ?? parseIntMaybe((r as { item_id?: unknown }).item_id),
        quantity: parseNumber(r.quantity) ?? 0,
        unit: parseString(r.unit) ?? "",
        unitId: parseIntMaybe(r.unitId),
        unitPrice: parseNumber(r.unitPrice) ?? 0,
        taxRatePercent: parseNumber(r.taxRatePercent),
        taxInclusive: parseBool(r.taxInclusive),
        notes: parseString(r.notes),
      })).filter((it) => it.itemId != null && it.quantity > 0);
      if (items.length === 0) continue;
      out.push({
        source_id: `supplier_order_${gi}_${ok}`,
        payload: {
          supplierId,
          orderNumber: parseString(first.orderNumber) ?? parseString(first.order_number),
          orderDate: parseString(first.orderDate) ?? parseString(first.order_date),
          expectedDeliveryDate: parseString(first.expectedDeliveryDate),
          status: parseString(first.status) ?? "pending",
          notes: parseString(first.notes),
          items,
        },
      });
    }
    return out;
  }

  const out: StagedBulkRow[] = [];
  rows.forEach((row, i) => {
    out.push({ source_id: `row_${i + 1}`, payload: row });
  });
  return out;
}
