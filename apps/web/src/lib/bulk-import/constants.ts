export const BULK_IMPORT_ENTITY_NAMES = [
  "recipe",
  "items",
  "suppliers",
  "supplier_orders",
  "sales",
  "expenses",
  "subscriptions",
  "loans",
  "loan_payments",
  "personnel",
  "leasing",
  "stock_movements",
] as const;

export type BulkImportEntity = (typeof BULK_IMPORT_ENTITY_NAMES)[number];

export const BULK_IMPORT_ENTITY_LABELS: Record<BulkImportEntity, string> = {
  recipe: "Recipes",
  items: "Items",
  suppliers: "Suppliers",
  supplier_orders: "Supplier orders",
  sales: "Sales",
  expenses: "Expenses",
  subscriptions: "Subscriptions",
  loans: "Loans (input)",
  loan_payments: "Loan payments (output)",
  personnel: "Personnel",
  leasing: "Leasing",
  stock_movements: "Stock movements",
};
