import * as XLSX from "xlsx";
import type { BulkImportEntity } from "./constants";
import { BULK_IMPORT_ENTITY_LABELS } from "./constants";
import { BULK_IMPORT_COLUMNS, bulkImportExampleDataRow } from "./templates";

function instructionRows(entity: BulkImportEntity): string[][] {
  const label = BULK_IMPORT_ENTITY_LABELS[entity];
  const lines: string[][] = [
    [`${label} — bulk import`],
    [],
    [
      "This template includes column reference and sample data.",
      "",
      "",
    ],
    [
      "Import flow: upload → review mappings in the app → Apply.",
      "",
      "",
    ],
    [],
    ["Column", "Required", "Description"],
  ];
  for (const c of BULK_IMPORT_COLUMNS[entity]) {
    lines.push([c.key, c.required ? "yes" : "no", c.description]);
  }
  if (entity === "recipe") {
    lines.push(
      [],
      ["Sheets: recipes + recipe_items", "", ""],
      [
        "recipes",
        "",
        "One row per recipe. The name column must match recipe_items.recipe_name for ingredient lines.",
      ],
      [
        "recipe_items",
        "",
        "Ingredient lines: item_id and quantity reference your catalog (IDs).",
      ]
    );
  }
  if (entity === "supplier_orders") {
    lines.push(
      [],
      ["Sheets: orders + order_lines", "", ""],
      [
        "orders",
        "",
        "One row per PO header: order_number, supplier_id, dates, status.",
      ],
      [
        "order_lines",
        "",
        "Lines use the same order_number as orders; item_id references your catalog.",
      ]
    );
  }
  return lines;
}

function appendInstructions(wb: XLSX.WorkBook, entity: BulkImportEntity) {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructionRows(entity)), "Instructions");
}

function appendDataSheet(wb: XLSX.WorkBook, entity: BulkImportEntity) {
  const { headers, values } = bulkImportExampleDataRow(entity);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, values]), "Data");
}

export function buildBulkImportExampleXlsxBlob(entity: BulkImportEntity): { filename: string; blob: Blob } {
  const wb = XLSX.utils.book_new();

  if (entity === "recipe") {
    appendInstructions(wb, entity);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        [
          "name",
          "description",
          "unit",
          "category",
          "serving_size",
          "preparation_time",
          "cooking_time",
          "instructions",
          "notes",
          "is_active",
          "produced_item_id",
          "unit_id",
        ],
        [
          "House vinaigrette",
          "Demo recipe row",
          "serving",
          "sauces",
          "4",
          "",
          "",
          "Whisk oil and vinegar.",
          "",
          "true",
          "",
          "",
        ],
      ]),
      "recipes"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["recipe_name", "item_id", "quantity", "unit", "notes"],
        ["House vinaigrette", "1", "0.1", "l", "Oil"],
        ["House vinaigrette", "2", "0.05", "l", "Vinegar"],
      ]),
      "recipe_items"
    );
  } else if (entity === "supplier_orders") {
    appendInstructions(wb, entity);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        [
          "order_number",
          "supplier_id",
          "order_date",
          "expected_delivery_date",
          "status",
          "notes",
        ],
        ["PO-2026-001", "1", "2026-01-10", "2026-01-15", "pending", "Demo PO"],
      ]),
      "orders"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        [
          "order_number",
          "item_id",
          "quantity",
          "unit",
          "unit_price",
          "tax_rate_percent",
          "tax_inclusive",
          "notes",
        ],
        ["PO-2026-001", "10", "2", "kg", "4.5", "", "", "Line 1"],
        ["PO-2026-001", "11", "1", "each", "12", "", "", "Line 2"],
      ]),
      "order_lines"
    );
  } else {
    appendInstructions(wb, entity);
    appendDataSheet(wb, entity);
  }

  const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return {
    filename: `bulk-import-${entity}-example.xlsx`,
    blob: new Blob([ab], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  };
}
