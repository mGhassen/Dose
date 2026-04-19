import type { BulkImportEntity } from "./constants";
import { BULK_IMPORT_ENTITY_LABELS } from "./constants";

export type TemplateColumn = { key: string; description: string; required?: boolean };

export const BULK_IMPORT_COLUMNS: Record<BulkImportEntity, TemplateColumn[]> = {
  recipe: [
    { key: "name", description: "Recipe name", required: true },
    { key: "description", description: "Optional description" },
    { key: "unit_id", description: "Unit variable id (optional)" },
    { key: "produced_item_id", description: "Produced item id (optional)" },
  ],
  items: [
    { key: "name", description: "Item name", required: true },
    { key: "item_types", description: "Comma-separated: item, product, modifier, ingredient", required: true },
    { key: "unit_id", description: "Unit id" },
    { key: "category_id", description: "Category id" },
    { key: "sku", description: "SKU" },
    { key: "unit_price", description: "Default sell price" },
    { key: "unit_cost", description: "Default cost" },
    { key: "vendor_id", description: "Supplier id" },
    { key: "affects_stock", description: "true/false" },
  ],
  suppliers: [
    { key: "name", description: "Supplier name", required: true },
    { key: "email", description: "Email" },
    { key: "phone", description: "Phone" },
    { key: "address", description: "Address" },
    { key: "contact_person", description: "Contact" },
    { key: "payment_terms", description: "Terms" },
    { key: "supplier_type", description: "Comma-separated: supplier, vendor, lender, …" },
  ],
  supplier_orders: [
    { key: "order_key", description: "Same value for all lines of one order", required: true },
    { key: "supplier_id", description: "Supplier id", required: true },
    { key: "order_number", description: "Optional order number" },
    { key: "order_date", description: "YYYY-MM-DD" },
    { key: "item_id", description: "Item id", required: true },
    { key: "quantity", description: "Quantity", required: true },
    { key: "unit", description: "Unit label", required: true },
    { key: "unit_price", description: "Unit price", required: true },
  ],
  sales: [
    { key: "sale_group_id", description: "Same id for all lines of one sale", required: true },
    { key: "date", description: "YYYY-MM-DD", required: true },
    { key: "type", description: "on_site | delivery | takeaway | catering | other", required: true },
    { key: "description", description: "Optional" },
    { key: "item_id", description: "Line item id", required: true },
    { key: "quantity", description: "Quantity", required: true },
    { key: "unit_price", description: "Unit price excl.", required: true },
  ],
  expenses: [
    { key: "name", description: "Expense name", required: true },
    { key: "category", description: "rent | utilities | supplies | …", required: true },
    { key: "amount", description: "Amount", required: true },
    { key: "expense_date", description: "YYYY-MM-DD", required: true },
    { key: "description", description: "Optional" },
    { key: "supplier_id", description: "Optional supplier id" },
  ],
  subscriptions: [
    { key: "name", description: "Subscription name", required: true },
    { key: "category", description: "Expense category", required: true },
    { key: "amount", description: "Amount", required: true },
    { key: "recurrence", description: "one_time | monthly | quarterly | yearly | custom", required: true },
    { key: "start_date", description: "YYYY-MM-DD", required: true },
    { key: "end_date", description: "Optional" },
    { key: "description", description: "Optional" },
    { key: "supplier_id", description: "Optional" },
  ],
  loans: [
    { key: "name", description: "Loan label", required: true },
    { key: "loan_number", description: "Reference number", required: true },
    { key: "principal_amount", description: "Principal", required: true },
    { key: "interest_rate", description: "Annual rate (e.g. 0.05)", required: true },
    { key: "duration_months", description: "Duration in months", required: true },
    { key: "start_date", description: "YYYY-MM-DD", required: true },
    { key: "supplier_id", description: "Lender as supplier id (optional)" },
    { key: "description", description: "Optional" },
  ],
  loan_payments: [
    { key: "loan_id", description: "Loan id", required: true },
    { key: "schedule_entry_id", description: "loan_schedules.id", required: true },
    { key: "payment_date", description: "YYYY-MM-DD", required: true },
    { key: "amount", description: "Payment amount", required: true },
    { key: "notes", description: "Optional" },
  ],
  personnel: [
    { key: "first_name", description: "First name", required: true },
    { key: "last_name", description: "Last name", required: true },
    { key: "position", description: "Role", required: true },
    { key: "type", description: "full_time | part_time | contractor | intern", required: true },
    { key: "base_salary", description: "Salary (see frequency)", required: true },
    { key: "salary_frequency", description: "yearly | monthly | weekly | hourly", required: true },
    { key: "employer_charges", description: "Charges amount", required: true },
    { key: "employer_charges_type", description: "percentage | fixed", required: true },
    { key: "start_date", description: "YYYY-MM-DD", required: true },
  ],
  leasing: [
    { key: "name", description: "Lease name", required: true },
    { key: "type", description: "operating | finance", required: true },
    { key: "amount", description: "Per-period amount (or use total_amount)", required: true },
    { key: "start_date", description: "YYYY-MM-DD", required: true },
    { key: "end_date", description: "Required if total_amount set" },
    { key: "frequency", description: "Recurrence", required: true },
    { key: "total_amount", description: "Optional total contract" },
    { key: "supplier_id", description: "Lessor supplier id (optional)" },
  ],
  stock_movements: [
    { key: "item_id", description: "Item id", required: true },
    { key: "movement_type", description: "in | out | adjustment | transfer | waste | expired", required: true },
    { key: "quantity", description: "Quantity", required: true },
    { key: "unit", description: "Unit label (or unit_id)", required: true },
    { key: "movement_date", description: "ISO date" },
    { key: "notes", description: "Optional" },
  ],
};

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function buildBulkImportExampleCsv(entity: BulkImportEntity): { filename: string; content: string } {
  const cols = BULK_IMPORT_COLUMNS[entity];
  const headers = cols.map((c) => c.key);
  const sample: Record<string, string> = {};
  for (const c of cols) {
    sample[c.key] = c.required ? `<${c.key}>` : "";
  }
  if (entity === "items") {
    sample["name"] = "Example item";
    sample["item_types"] = "item";
  }
  if (entity === "sales") {
    sample["sale_group_id"] = "g1";
    sample["date"] = "2026-01-15";
    sample["type"] = "on_site";
    sample["item_id"] = "1";
    sample["quantity"] = "2";
    sample["unit_price"] = "3.50";
  }
  if (entity === "supplier_orders") {
    sample["order_key"] = "ord1";
    sample["supplier_id"] = "1";
    sample["item_id"] = "1";
    sample["quantity"] = "10";
    sample["unit"] = "kg";
    sample["unit_price"] = "5";
  }
  const line = headers.map((h) => csvEscape(sample[h] ?? "")).join(",");
  const headerLine = headers.map(csvEscape).join(",");
  return {
    filename: `bulk-import-${entity}-example.csv`,
    content: `${headerLine}\n${line}\n`,
  };
}

export function bulkImportTemplateHint(entity: BulkImportEntity): string {
  const label = BULK_IMPORT_ENTITY_LABELS[entity];
  const cols = BULK_IMPORT_COLUMNS[entity];
  const req = cols.filter((c) => c.required).map((c) => c.key);
  return `${label}: required columns — ${req.join(", ")}.`;
}
