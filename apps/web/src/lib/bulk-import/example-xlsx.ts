import * as XLSX from "xlsx";
import type { BulkImportEntity } from "./constants";

/** Minimal example workbook for entities that use multiple sheets. */
export function buildBulkImportExampleXlsxBlob(entity: BulkImportEntity): { filename: string; blob: Blob } {
  const wb = XLSX.utils.book_new();

  if (entity === "recipe") {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["name", "description", "unit_id"],
        ["Example recipe", "Demo", ""],
      ]),
      "recipes"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["recipe_name", "item_id", "quantity", "unit"],
        ["Example recipe", "1", "1", "kg"],
      ]),
      "recipe_items"
    );
  } else if (entity === "supplier_orders") {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["order_number", "supplier_id", "order_date", "status"],
        ["PO-001", "1", "2026-01-01", "pending"],
      ]),
      "orders"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["order_number", "item_id", "quantity", "unit", "unit_price"],
        ["PO-001", "1", "2", "kg", "4.5"],
      ]),
      "order_lines"
    );
  } else {
    const ws = XLSX.utils.aoa_to_sheet([["column"], ["See CSV example"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  }

  const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return {
    filename: `bulk-import-${entity}-example.xlsx`,
    blob: new Blob([ab], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  };
}
