import { z } from "zod";
import { NextResponse } from "next/server";
import { isConvertibleDimension } from "@/lib/units/dimensions";

export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<
  | { success: true; data: T }
  | { success: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first?.message ?? "Validation failed";
    return {
      success: false,
      response: NextResponse.json({ error: message }, { status: 400 }),
    };
  }
  return { success: true, data: result.data };
}

export function parseBody<T>(
  raw: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      success: false,
      response: NextResponse.json(
        { error: first?.message ?? "Validation failed" },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}

export const EXPENSE_CATEGORY_NAMES = [
  "rent",
  "utilities",
  "supplies",
  "marketing",
  "insurance",
  "maintenance",
  "professional_services",
  "other",
] as const;
export const EXPENSE_RECURRENCE_NAMES = ["one_time", "monthly", "quarterly", "yearly", "custom"] as const;
export const SALES_TYPE_NAMES = ["on_site", "delivery", "takeaway", "catering", "other"] as const;
export const VARIABLE_TYPE_NAMES = [
  "charge",
  "cost",
  "tax",
  "transaction_tax",
  "inflation",
  "exchange_rate",
  "unit",
  "other",
] as const;
export const PERSONNEL_TYPE_NAMES = ["full_time", "part_time", "contractor", "intern"] as const;
export const LEASING_TYPE_NAMES = ["operating", "finance"] as const;
export const LOAN_STATUS_NAMES = ["active", "paid_off", "defaulted"] as const;
export const INVESTMENT_TYPE_NAMES = ["equipment", "renovation", "technology", "vehicle", "other"] as const;
export const DEPRECIATION_METHOD_NAMES = ["straight_line", "declining_balance", "units_of_production"] as const;
export const STOCK_MOVEMENT_TYPE_NAMES = ["in", "out", "adjustment", "transfer", "waste", "expired"] as const;
export const PAYMENT_METHOD_NAMES = ["cash", "card", "bank_transfer"] as const;
export const SALARY_FREQUENCY_NAMES = ["yearly", "monthly", "weekly", "hourly"] as const;
export const PERSONNEL_HOUR_PERIOD_TYPE_NAMES = ["day", "week", "month"] as const;
export const BUDGET_PERIOD_NAMES = ["monthly", "quarterly", "yearly"] as const;
export const SYNC_TYPE_NAMES = ["orders", "payments", "catalog", "locations", "transactions", "full"] as const;
export const SYNC_PERIOD_MODE_NAMES = ["last_sync", "custom", "all"] as const;
export const UNIT_DIMENSION_NAMES = ["mass", "volume", "count", "other"] as const;
export const ITEM_CATEGORY_NAMES = ["food", "beverage", "supplies", "other"] as const;
export const SUPPLIER_PAYMENT_TERMS_NAMES = ["net_30", "net_15", "cod", "due_on_receipt", "net_60"] as const;
// Supplier types are metadata-driven (not hardcoded here).
export const GLOBAL_DATE_FILTER_PRESET_NAMES = ["this_month", "this_quarter", "this_year", "custom"] as const;

const expenseCategoryEnum = z.enum(EXPENSE_CATEGORY_NAMES);
const expenseRecurrenceEnum = z.enum(EXPENSE_RECURRENCE_NAMES);

export const createSubscriptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: expenseCategoryEnum,
  amount: z.number().min(0, "Amount must be non-negative"),
  recurrence: expenseRecurrenceEnum,
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  supplierId: z.number().optional(),
  defaultTaxRatePercent: z.number().optional(),
  isActive: z.boolean().optional(),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = createSubscriptionSchema.partial();
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

const paymentMethodEnum = z.enum(PAYMENT_METHOD_NAMES);
export const createPaymentSchema = z
  .object({
    entryId: z.number().int().positive().optional(),
    entryType: z.enum(["expense", "sale"]).optional(),
    referenceId: z.number().int().positive().optional(),
    paymentDate: z.string().min(1, "Payment date is required"),
    amount: z.number().positive("Amount must be positive"),
    isPaid: z.boolean().optional(),
    paidDate: z.string().optional(),
    paymentMethod: paymentMethodEnum.optional(),
    notes: z.string().optional(),
    bankTransactionId: z.number().int().positive().optional(),
    paymentGroupId: z.string().uuid().optional(),
  })
  .refine(
    (d) =>
      d.entryId != null || (d.entryType != null && d.referenceId != null),
    { message: "Provide entryId or entryType + referenceId", path: ["entryId"] }
  );
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z.object({
  entryId: z.number().int().positive().optional(),
  paymentDate: z.string().min(1).optional(),
  amount: z.number().optional(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().optional().nullable(),
  paymentMethod: paymentMethodEnum.optional().nullable(),
  notes: z.string().optional().nullable(),
  bankTransactionId: z.number().int().positive().nullable().optional(),
  paymentGroupId: z.string().uuid().nullable().optional(),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const createSubscriptionFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    category: expenseCategoryEnum.optional(),
    amount: z.coerce.number().min(0, "Amount must be non-negative"),
    recurrence: expenseRecurrenceEnum,
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    description: z.string().optional(),
    vendor: z.string().optional(),
    supplierId: z.number().optional(),
    defaultTaxRatePercent: z.number().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.category != null, {
    message: "Category is required",
    path: ["category"],
  });
export type CreateSubscriptionFormInput = z.infer<typeof createSubscriptionFormSchema>;

const transactionDiscountSchema = z.object({
  type: z.enum(["amount", "percent"]),
  value: z.number(),
});

const expenseLineItemSchema = z.object({
  itemId: z.number().optional(),
  subscriptionId: z.number().optional(),
  quantity: z.number().min(0.000001, "Quantity must be positive"),
  unitId: z.number().optional(),
  unitPrice: z.number(),
  unitCost: z.number().optional(),
  taxRatePercent: z.number().optional(),
  taxInclusive: z.boolean().optional(),
});

export const paymentSliceSchema = z.object({
  id: z.number().int().positive().optional(),
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  notes: z.string().optional(),
  bankTransactionId: z.number().int().positive().optional(),
  paymentGroupId: z.string().uuid().optional(),
});
export type PaymentSliceInput = z.infer<typeof paymentSliceSchema>;

export const createExpenseTransactionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: expenseCategoryEnum,
  expenseDate: z.string().min(1, "Expense date is required"),
  description: z.string().optional(),
  supplierId: z.number().optional(),
  /** When set, stock is updated only via supplier-order receive, not from this expense. */
  supplierOrderId: z.number().int().positive().optional(),
  lineItems: z.array(expenseLineItemSchema).min(1, "At least one line item is required"),
  discount: transactionDiscountSchema.optional(),
  paymentSlices: z.array(paymentSliceSchema).min(1).optional(),
});
export type CreateExpenseTransactionInput = z.infer<typeof createExpenseTransactionSchema>;

const expenseTypeEnum = z.enum(['expense', 'subscription', 'leasing', 'loan', 'personnel', 'other']);

export const createExpenseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: expenseCategoryEnum,
  amount: z.number().min(0),
  expenseType: expenseTypeEnum.optional(),
  expenseDate: z.string().min(1, "Expense date is required"),
  description: z.string().optional(),
  vendor: z.string().optional(),
  supplierId: z.number().optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/** Body for POST /api/bank-transactions/:id/create-expense (orchestrates draft supplier order + expense + reconcile). */
export const bankTransactionCreateExpenseBodySchema = createExpenseSchema.extend({
  supplierOrderId: z.number().int().positive().optional(),
});
export type BankTransactionCreateExpenseBody = z.infer<typeof bankTransactionCreateExpenseBodySchema>;

export const bankTransactionAllocatePaymentBodySchema = z.object({
  entryId: z.number().int().positive(),
  amount: z.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
  paymentMethod: paymentMethodEnum.optional(),
});
export type BankTransactionAllocatePaymentBody = z.infer<typeof bankTransactionAllocatePaymentBodySchema>;

export const updateExpenseSchema = z.object({
  name: z.string().min(1).optional(),
  category: expenseCategoryEnum.optional(),
  amount: z.number().min(0).optional(),
  expenseType: expenseTypeEnum.optional(),
  expenseDate: z.string().min(1).optional(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  supplierId: z.number().optional(),
  supplierOrderId: z.union([z.number().int().positive(), z.null()]).optional(),
  lineItems: z.array(expenseLineItemSchema).optional(),
  discount: transactionDiscountSchema.optional(),
  paymentSlices: z.array(paymentSliceSchema).min(1).optional(),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

const salesTypeEnum = z.enum(SALES_TYPE_NAMES);

const saleLineItemSchema = z.object({
  itemId: z.number().optional(),
  quantity: z.number().min(0.000001, "Quantity must be positive"),
  unitId: z.number().optional(),
  unitPrice: z.number(),
  unitCost: z.number().optional(),
  taxRatePercent: z.number().optional(),
  parentLineIndex: z.number().int().min(0).optional(),
});

export const createSaleTransactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: salesTypeEnum,
  lineItems: z.array(saleLineItemSchema).min(1, "At least one line item is required"),
  discount: transactionDiscountSchema.optional(),
  description: z.string().optional(),
  paymentSlices: z.array(paymentSliceSchema).min(1).optional(),
});
export type CreateSaleTransactionInput = z.infer<typeof createSaleTransactionSchema>;

/** Body for POST /api/bank-transactions/:id/create-sale (same shape as create sale transaction; payments linked server-side). */
export const bankTransactionCreateSaleBodySchema = createSaleTransactionSchema;
export type BankTransactionCreateSaleBody = z.infer<typeof bankTransactionCreateSaleBodySchema>;

export const updateSaleTransactionSchema = z.object({
  date: z.string().min(1).optional(),
  type: salesTypeEnum.optional(),
  lineItems: z.array(saleLineItemSchema).optional(),
  discount: transactionDiscountSchema.optional(),
  description: z.string().optional(),
  paymentSlices: z.array(paymentSliceSchema).min(1).optional(),
});
export type UpdateSaleTransactionInput = z.infer<typeof updateSaleTransactionSchema>;

export const createExpenseTransactionFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    category: expenseCategoryEnum.optional(),
    expenseDate: z.string().min(1, "Expense date is required"),
    description: z.string().optional(),
    supplierId: z.union([z.number(), z.string().transform((s) => (s === "" ? undefined : Number(s)))]).optional(),
    discountType: z.enum(["amount", "percent"]).optional(),
    discountValue: z.coerce.number().min(0).optional(),
    lineItems: z.array(
      z.object({
        itemId: z.union([z.number(), z.string()]).optional(),
        subscriptionId: z.number().optional(),
        quantity: z.coerce.number().min(0.000001, "Quantity must be positive"),
        unitId: z.number().nullable().optional(),
        unitPrice: z.coerce.number().min(0, "Unit price is required"),
        unitCost: z.coerce.number().optional(),
        taxRatePercent: z.coerce.number().optional(),
      })
    ),
  })
  .refine((d) => d.category != null, { message: "Category is required", path: ["category"] })
  .refine((d) => d.lineItems.some((l) => (l.itemId != null && l.itemId !== "") || l.subscriptionId != null), {
    message: "At least one line item is required",
    path: ["lineItems"],
  });
export type CreateExpenseTransactionFormInput = z.infer<typeof createExpenseTransactionFormSchema>;

export const createSaleTransactionFormSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    type: salesTypeEnum.optional(),
    description: z.string().optional(),
    discountType: z.enum(["amount", "percent"]).optional(),
    discountValue: z.coerce.number().min(0).optional(),
    lineItems: z.array(
      z.object({
        itemId: z.union([z.number(), z.string()]).optional(),
        quantity: z.coerce.number().min(0.000001, "Quantity must be positive"),
        unitId: z.number().nullable().optional(),
        unitPrice: z.coerce.number().min(0, "Unit price is required"),
        unitCost: z.coerce.number().optional(),
        taxRatePercent: z.coerce.number().optional(),
      })
    ),
  })
  .refine((d) => d.type != null, { message: "Type is required", path: ["type"] })
  .refine((d) => d.lineItems.some((l) => l.itemId != null && l.itemId !== ""), {
    message: "At least one line item is required",
    path: ["lineItems"],
  });
export type CreateSaleTransactionFormInput = z.infer<typeof createSaleTransactionFormSchema>;

export const createItemSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    unitId: z.number().optional(),
    categoryId: z.number().nullable().optional(),
    sku: z.string().optional(),
    unitPrice: z.number().optional(),
    unitCost: z.number().optional(),
    vendorId: z.number().optional(),
    notes: z.string().optional(),
    defaultTaxRatePercent: z.number().optional(),
    isActive: z.boolean().optional(),
    affectsStock: z.boolean().optional(),
    itemTypes: z
      .array(z.enum(["item", "product", "modifier", "ingredient"]))
      .min(1)
      .refine((a) => new Set(a).size === a.length, { message: "Duplicate kinds" })
      .optional(),
  });
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial().extend({
  producedFromRecipeId: z.number().nullable().optional(),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const createItemGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  canonicalItemId: z.number().int().positive(),
  memberItemIds: z
    .array(z.number().int().positive())
    .min(2, "At least 2 items are required to create a group")
    .refine((a) => new Set(a).size === a.length, { message: "Duplicate item ids" }),
});
export type CreateItemGroupInput = z.infer<typeof createItemGroupSchema>;

export const updateItemGroupSchema = z
  .object({
    name: z.string().min(1).optional(),
    canonicalItemId: z.number().int().positive().optional(),
    addMemberIds: z.array(z.number().int().positive()).optional(),
    removeMemberIds: z.array(z.number().int().positive()).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.canonicalItemId !== undefined ||
      (v.addMemberIds && v.addMemberIds.length > 0) ||
      (v.removeMemberIds && v.removeMemberIds.length > 0),
    { message: "Nothing to update" }
  );
export type UpdateItemGroupInput = z.infer<typeof updateItemGroupSchema>;

export const createIngredientSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    unitId: z.number().optional(),
    description: z.string().optional(),
    categoryId: z.number().nullable().optional(),
    sku: z.string().optional(),
    unitPrice: z.number().optional(),
    unitCost: z.number().optional(),
    vendorId: z.number().optional(),
    notes: z.string().optional(),
    defaultTaxRatePercent: z.number().optional(),
    isActive: z.boolean().optional(),
  });
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

export const updateIngredientSchema = createIngredientSchema.partial().extend({
  producedFromRecipeId: z.number().nullable().optional(),
});
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

const unitDimensionEnum = z.enum(UNIT_DIMENSION_NAMES);
export const createUnitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  dimension: unitDimensionEnum.optional(),
  baseUnitId: z.number().optional(),
  factorToBase: z.number().optional(),
});
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = createUnitSchema.partial();
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

const supplierTypeArraySchema = z.array(z.string().min(1)).optional();

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  supplierType: supplierTypeArraySchema,
  isActive: z.boolean().optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const createItemPriceHistorySchema = z.object({
  type: z.enum(["sell", "cost"]),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "effectiveDate must be YYYY-MM-DD"),
  value: z.number().min(0, "value must be non-negative"),
  taxIncluded: z.boolean().optional(),
});
export type CreateItemPriceHistoryInput = z.infer<typeof createItemPriceHistorySchema>;

export const updateItemPriceHistorySchema = z
  .object({
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    value: z.number().min(0).optional(),
    taxIncluded: z.boolean().optional(),
  })
  .refine((d) => d.effectiveDate !== undefined || d.value !== undefined || d.taxIncluded !== undefined, {
    message: "No updates provided",
  });
export type UpdateItemPriceHistoryInput = z.infer<typeof updateItemPriceHistorySchema>;

const variableTypeEnum = z.enum(VARIABLE_TYPE_NAMES);
const variablePayloadSchema = z.record(z.string(), z.unknown()).optional().nullable();
export const createVariableSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    type: z.preprocess(
      (s) => (typeof s === "string" ? s.toLowerCase().trim() : s),
      variableTypeEnum
    ),
    value: z.number().optional(),
    unitId: z.number().int().positive().nullable().optional(),
    unit: z.string().optional(),
    effectiveDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    payload: variablePayloadSchema,
  })
  .superRefine((data, ctx) => {
    if (data.type !== "unit") {
      const v = data.value;
      if (v === undefined || typeof v !== "number" || Number.isNaN(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Value is required", path: ["value"] });
      }
      return;
    }
    const payload = data.payload as Record<string, unknown> | undefined;
    if (!payload?.symbol || typeof payload.symbol !== "string" || !payload.symbol.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unit type requires payload.symbol", path: ["payload"] });
    }
    const dimension = typeof payload?.dimension === "string" ? payload.dimension : undefined;
    if (isConvertibleDimension(dimension)) {
      const v = data.value;
      if (v === undefined || typeof v !== "number" || Number.isNaN(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Factor to base is required for this dimension", path: ["value"] });
      }
    }
  });
export type CreateVariableInput = z.infer<typeof createVariableSchema>;

export const updateVariableSchema = createVariableSchema.partial();
export type UpdateVariableInput = z.infer<typeof updateVariableSchema>;

export const createTaxRuleSchema = z.object({
  variableId: z.number().int().positive("variableId is required"),
  conditionType: z.enum(["sales_type", "expense"]).nullable().optional(),
  conditionValue: z.string().nullable().optional(),
  conditionValues: z.array(z.string()).nullable().optional(),
  scopeType: z.enum(["all", "items", "categories"]).optional(),
  scopeItemIds: z.array(z.number()).nullable().optional(),
  scopeCategories: z.array(z.string()).nullable().optional(),
  priority: z.number().optional(),
  effectiveDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  applyToCustomAmounts: z.boolean().optional(),
  applyToFutureItems: z.boolean().optional(),
  ruleType: z.enum(["taxable", "exemption"]).optional(),
  calculationType: z.enum(["additive", "inclusive"]).nullable().optional(),
});
export type CreateTaxRuleInput = z.infer<typeof createTaxRuleSchema>;

export const updateTaxRuleSchema = createTaxRuleSchema.partial();
export type UpdateTaxRuleInput = z.infer<typeof updateTaxRuleSchema>;

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fiscalYearStart: z.string().min(1, "Fiscal year start is required"),
  budgetPeriod: z.enum(BUDGET_PERIOD_NAMES).optional(),
  reportingTagId: z.number().nullable().optional(),
});
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export const updateBudgetSchema = createBudgetSchema.partial();
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const createBudgetAccountSchema = z.object({
  budgetId: z.number(),
  accountPath: z.string().min(1),
  accountLabel: z.string().min(1),
  accountType: z.enum(["income", "expense", "asset", "liability", "equity"]),
  level: z.number(),
  parentPath: z.string().nullable().optional(),
  isGroup: z.boolean().optional(),
  displayOrder: z.number().optional(),
});
export type CreateBudgetAccountInput = z.infer<typeof createBudgetAccountSchema>;
export const updateBudgetAccountSchema = createBudgetAccountSchema.partial();
export type UpdateBudgetAccountInput = z.infer<typeof updateBudgetAccountSchema>;

export const createCashFlowEntrySchema = z.object({
  month: z.string().min(1),
  openingBalance: z.number(),
  cashInflows: z.number(),
  cashOutflows: z.number(),
  notes: z.string().optional(),
});
export type CreateCashFlowEntryInput = z.infer<typeof createCashFlowEntrySchema>;
export const updateCashFlowEntrySchema = createCashFlowEntrySchema.partial();
export type UpdateCashFlowEntryInput = z.infer<typeof updateCashFlowEntrySchema>;

export const createWorkingCapitalSchema = z.object({
  month: z.string().min(1),
  accountsReceivable: z.number(),
  inventory: z.number(),
  accountsPayable: z.number(),
  otherCurrentAssets: z.number().optional(),
  otherCurrentLiabilities: z.number().optional(),
});
export type CreateWorkingCapitalInput = z.infer<typeof createWorkingCapitalSchema>;
export const updateWorkingCapitalSchema = createWorkingCapitalSchema.partial();
export type UpdateWorkingCapitalInput = z.infer<typeof updateWorkingCapitalSchema>;

export const createProfitAndLossSchema = z.object({
  month: z.string().min(1),
  totalRevenue: z.number(),
  costOfGoodsSold: z.number().optional(),
  operatingExpenses: z.number().optional(),
  personnelCosts: z.number().optional(),
  leasingCosts: z.number().optional(),
  depreciation: z.number().optional(),
  interestExpense: z.number().optional(),
  taxes: z.number().optional(),
  otherExpenses: z.number().optional(),
});
export type CreateProfitAndLossInput = z.infer<typeof createProfitAndLossSchema>;
export const updateProfitAndLossSchema = createProfitAndLossSchema.partial();
export type UpdateProfitAndLossInput = z.infer<typeof updateProfitAndLossSchema>;

export const createBalanceSheetSchema = z.object({
  month: z.string().min(1),
  currentAssets: z.number(),
  fixedAssets: z.number(),
  intangibleAssets: z.number().optional(),
  currentLiabilities: z.number(),
  longTermDebt: z.number(),
  shareCapital: z.number(),
  retainedEarnings: z.number().optional(),
});
export type CreateBalanceSheetInput = z.infer<typeof createBalanceSheetSchema>;
export const updateBalanceSheetSchema = createBalanceSheetSchema.partial();
export type UpdateBalanceSheetInput = z.infer<typeof updateBalanceSheetSchema>;

export const createFinancialPlanSchema = z.object({
  month: z.string().min(1),
  equity: z.number().optional(),
  loans: z.number().optional(),
  otherSources: z.number().optional(),
  investments: z.number().optional(),
  workingCapital: z.number().optional(),
  loanRepayments: z.number().optional(),
  otherUses: z.number().optional(),
});
export type CreateFinancialPlanInput = z.infer<typeof createFinancialPlanSchema>;
export const updateFinancialPlanSchema = createFinancialPlanSchema.partial();
export type UpdateFinancialPlanInput = z.infer<typeof updateFinancialPlanSchema>;

export const createEntrySchema = z.object({
  direction: z.enum(["input", "output"]),
  entryType: z.string().min(1),
  name: z.string().min(1),
  amount: z.number(),
  description: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  entryDate: z.string().min(1),
  dueDate: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.string().optional(),
  referenceId: z.number().optional(),
  scheduleEntryId: z.number().optional(),
});
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export const updateEntrySchema = createEntrySchema.partial().extend({ isActive: z.boolean().optional() });
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

export const createActualPaymentSchema = z.object({
  paymentType: z.enum(["loan", "leasing", "expense", "subscription", "sale"]),
  direction: z.enum(["input", "output"]),
  referenceId: z.number(),
  scheduleEntryId: z.number().optional(),
  month: z.string().min(1),
  paymentDate: z.string().min(1),
  amount: z.number(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateActualPaymentInput = z.infer<typeof createActualPaymentSchema>;
export const updateActualPaymentSchema = z.object({
  paymentDate: z.string().optional(),
  amount: z.number().optional(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().optional(),
  actualAmount: z.number().optional(),
  notes: z.string().optional(),
});
export type UpdateActualPaymentInput = z.infer<typeof updateActualPaymentSchema>;

const personnelTypeEnum = z.enum(PERSONNEL_TYPE_NAMES);
export const createPersonnelSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().optional(),
  position: z.string().min(1),
  type: personnelTypeEnum,
  baseSalary: z.number(),
  salaryFrequency: z.enum(SALARY_FREQUENCY_NAMES),
  employerCharges: z.number(),
  employerChargesType: z.enum(["percentage", "fixed"]),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});
export type CreatePersonnelInput = z.infer<typeof createPersonnelSchema>;
export const updatePersonnelSchema = createPersonnelSchema.partial();
export type UpdatePersonnelInput = z.infer<typeof updatePersonnelSchema>;

export const createPersonnelProjectionSchema = z.object({
  month: z.string().min(1),
  bruteSalary: z.number(),
  netSalary: z.number(),
  socialTaxes: z.number().optional(),
  employerTaxes: z.number().optional(),
  netPaymentDate: z.string().optional(),
  taxesPaymentDate: z.string().optional(),
  netPaidDate: z.string().optional(),
  taxesPaidDate: z.string().optional(),
  actualNetAmount: z.number().optional(),
  actualTaxesAmount: z.number().optional(),
  isProjected: z.boolean().optional(),
  isNetPaid: z.boolean().optional(),
  isTaxesPaid: z.boolean().optional(),
  notes: z.string().optional(),
});
export type CreatePersonnelProjectionInput = z.infer<typeof createPersonnelProjectionSchema>;

export const createPersonnelHourEntrySchema = z.object({
  periodType: z.enum(PERSONNEL_HOUR_PERIOD_TYPE_NAMES),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  hoursWorked: z.number().nonnegative(),
  hourlyRate: z.number().nonnegative(),
  taxVariableId: z.number().int().positive().optional(),
  taxRatePercent: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type CreatePersonnelHourEntryInput = z.infer<typeof createPersonnelHourEntrySchema>;
export const updatePersonnelHourEntrySchema = createPersonnelHourEntrySchema.partial();
export type UpdatePersonnelHourEntryInput = z.infer<typeof updatePersonnelHourEntrySchema>;

export const markPersonnelHourEntryPaidSchema = z.object({
  isPaid: z.boolean(),
  paidDate: z.string().optional(),
  category: z.string().optional(),
});
export type MarkPersonnelHourEntryPaidInput = z.infer<typeof markPersonnelHourEntryPaidSchema>;

const leasingTypeEnum = z.enum(LEASING_TYPE_NAMES);
export const createLeasingSchema = z
  .object({
    name: z.string().min(1),
    type: leasingTypeEnum,
    amount: z.number().optional(),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    frequency: expenseRecurrenceEnum,
    description: z.string().optional(),
    lessor: z.string().optional(),
    supplierId: z.number().optional(),
    isActive: z.boolean().optional(),
    offPaymentMonths: z.array(z.number()).optional(),
    firstPaymentAmount: z.number().optional(),
    totalAmount: z.number().optional(),
  })
  .refine((d) => d.amount != null || d.totalAmount != null, {
    message: "Either amount or totalAmount must be provided",
    path: ["amount"],
  })
  .refine((d) => !d.totalAmount || d.endDate, {
    message: "End date is required when using totalAmount",
    path: ["endDate"],
  });
export type CreateLeasingInput = z.infer<typeof createLeasingSchema>;
export const updateLeasingSchema = createLeasingSchema.partial();
export type UpdateLeasingInput = z.infer<typeof updateLeasingSchema>;

export const createLoanSchema = z.object({
  name: z.string().min(1),
  loanNumber: z.string().min(1),
  principalAmount: z.number(),
  interestRate: z.number(),
  durationMonths: z.number().int().positive(),
  startDate: z.string().min(1),
  status: z.enum(LOAN_STATUS_NAMES).optional(),
  lender: z.string().optional(),
  supplierId: z.number().optional(),
  description: z.string().optional(),
  offPaymentMonths: z.array(z.number()).optional(),
});
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export const updateLoanSchema = createLoanSchema.partial();
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;

const investmentTypeEnum = z.enum(INVESTMENT_TYPE_NAMES);
const depreciationMethodEnum = z.enum(DEPRECIATION_METHOD_NAMES);
export const createInvestmentSchema = z.object({
  name: z.string().min(1),
  type: investmentTypeEnum,
  amount: z.number(),
  purchaseDate: z.string().min(1),
  usefulLifeMonths: z.number().int().positive(),
  depreciationMethod: depreciationMethodEnum,
  residualValue: z.number(),
  description: z.string().optional(),
});
export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export const updateInvestmentSchema = createInvestmentSchema.partial();
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;

export const subscriptionProjectionPostSchema = z.object({
  month: z.string().min(1),
  amount: z.number(),
  isProjected: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().nullish(),
  actualAmount: z.number().nullish(),
  notes: z.string().nullish(),
});
export const updateSubscriptionProjectionEntrySchema = z.object({
  month: z.string().optional(),
  amount: z.number().optional(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().nullish(),
  actualAmount: z.number().nullish(),
  notes: z.string().nullish(),
});

export const createStockLevelSchema = z
  .object({
    itemId: z.number(),
    quantity: z.number(),
    unit: z.string().optional(),
    unitId: z.number().optional(),
    location: z.string().optional(),
    minimumStockLevel: z.number().optional(),
    maximumStockLevel: z.number().optional(),
  })
  .refine((d) => d.unit != null && d.unit !== "" || d.unitId != null, {
    message: "Provide either unit or unitId",
    path: ["unit"],
  });
export type CreateStockLevelInput = z.infer<typeof createStockLevelSchema>;
export const updateStockLevelSchema = createStockLevelSchema.partial();
export type UpdateStockLevelInput = z.infer<typeof updateStockLevelSchema>;

const stockMovementTypeEnum = z.enum(STOCK_MOVEMENT_TYPE_NAMES);
export const createStockMovementSchema = z
  .object({
    itemId: z.number(),
    movementType: stockMovementTypeEnum,
    quantity: z.number(),
    unit: z.string().optional(),
    unitId: z.number().optional(),
    referenceType: z.string().optional(),
    referenceId: z.number().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
    movementDate: z.string().optional(),
  })
  .refine((d) => (typeof d.unit === "string" && d.unit.trim() !== "") || d.unitId != null, {
    message: "Provide either unit or unitId",
    path: ["unit"],
  });
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export const updateStockMovementSchema = createStockMovementSchema.partial();
export type UpdateStockMovementInput = z.infer<typeof updateStockMovementSchema>;

export const createExpiryDateSchema = z
  .object({
    itemId: z.number(),
    stockMovementId: z.number().optional(),
    quantity: z.number(),
    unit: z.string().optional(),
    unitId: z.number().optional(),
    expiryDate: z.string().min(1),
    location: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.unit != null && d.unit !== "" || d.unitId != null, {
    message: "Provide either unit or unitId",
    path: ["unit"],
  });
export type CreateExpiryDateInput = z.infer<typeof createExpiryDateSchema>;
export const updateExpiryDateSchema = createExpiryDateSchema.partial().extend({
  disposedDate: z.string().optional(),
});
export type UpdateExpiryDateInput = z.infer<typeof updateExpiryDateSchema>;

const supplierOrderItemSchema = z.object({
  itemId: z.number(),
  quantity: z.number(),
  unit: z.string(),
  unitId: z.number().optional(),
  unitPrice: z.number(),
  taxRatePercent: z.number().optional(),
  taxInclusive: z.boolean().optional(),
  notes: z.string().optional(),
});
export const createSupplierOrderSchema = z.object({
  supplierId: z.number(),
  orderNumber: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(supplierOrderItemSchema).min(1, "At least one item is required"),
});
export type CreateSupplierOrderInput = z.infer<typeof createSupplierOrderSchema>;
export const updateSupplierOrderSchema = createSupplierOrderSchema.partial().extend({
  items: z.array(supplierOrderItemSchema.extend({ id: z.number().optional() })).optional(),
});
export type UpdateSupplierOrderInput = z.infer<typeof updateSupplierOrderSchema>;

export const receiveOrderSchema = z.object({
  actualDeliveryDate: z.string().optional(),
  items: z.array(
    z.object({
      itemId: z.number(),
      receivedQuantity: z.number(),
      location: z.string().optional(),
    })
  ).min(1, "At least one item is required"),
});
export type ReceiveOrderInput = z.infer<typeof receiveOrderSchema>;

const recipeItemSchema = z.object({
  itemId: z.number(),
  quantity: z.number(),
  unit: z.string().nullish(),
  unitId: z.number().nullish(),
  notes: z.string().nullish(),
});
const recipeModifierQuantitySchema = z.object({
  modifierId: z.number().int().positive(),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  unit: z.string().nullish(),
  unitId: z.number().nullish(),
  notes: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
  enabled: z.boolean().nullish(),
});
export const createRecipeSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  unit: z.string().nullish(),
  unitId: z.number().nullish(),
  category: z.string().nullish(),
  servingSize: z.number().nullish(),
  preparationTime: z.number().nullish(),
  cookingTime: z.number().nullish(),
  instructions: z.string().nullish(),
  notes: z.string().nullish(),
  isActive: z.boolean().nullish(),
  producedItemId: z.number().nullable().optional(),
  producedItemIds: z.array(z.number()).nullish(),
  items: z.array(recipeItemSchema).nullish(),
  modifierQuantities: z.array(recipeModifierQuantitySchema).nullish(),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

/** JSON commonly sends explicit `null`; Zod `.optional()` does not accept `null`. */
function nullsToUndefinedDeep(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(nullsToUndefinedDeep);
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      out[k] = nullsToUndefinedDeep(o[k]);
    }
    return out;
  }
  return value;
}

export const updateRecipeSchema = z.preprocess(
  nullsToUndefinedDeep,
  createRecipeSchema.partial()
);
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const produceRecipeSchema = z.object({
  quantity: z.number().min(0.000001, "Quantity must be greater than 0"),
  location: z.string().optional(),
  notes: z.string().optional(),
  producedItemId: z.number().optional(),
  producedItemName: z.string().optional(),
});
export type ProduceRecipeInput = z.infer<typeof produceRecipeSchema>;

export const createIntegrationSchema = z.object({
  integration_type: z.string().min(1, "integration_type is required"),
  name: z.string().min(1, "name is required"),
  config: z.record(z.string(), z.unknown()).optional(),
  sync_frequency: z.string().optional(),
});
export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export const updateIntegrationSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  sync_frequency: z.string().optional(),
  is_active: z.boolean().optional(),
});
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;

export const oauthCallbackBodySchema = z.object({
  code: z.string().min(1, "Missing authorization code"),
  state: z.string().optional(),
});
export const manualConnectSchema = z.object({
  integration_type: z.string().min(1),
  access_token: z.string().min(1),
  merchant_id: z.string().optional(),
  location_id: z.string().optional(),
});
const syncTypeEnum = z.enum(SYNC_TYPE_NAMES);
const syncPeriodModeEnum = z.enum(SYNC_PERIOD_MODE_NAMES);
export const syncBodySchema = z.object({
  sync_type: syncTypeEnum.optional(),
  period_mode: syncPeriodModeEnum.optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
});
export const importCsvSchema = z.object({
  import_type: z.string().min(1),
  data: z.array(z.record(z.string(), z.unknown())).min(1),
});

export const createMetadataEnumSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type CreateMetadataEnumInput = z.infer<typeof createMetadataEnumSchema>;

export const createItemCategorySchema = z.object({
  name: z.string().min(1).optional(),
  label: z.string().min(1),
  description: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});
export type CreateItemCategoryInput = z.infer<typeof createItemCategorySchema>;

export const updateItemCategorySchema = z.object({
  name: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateItemCategoryInput = z.infer<typeof updateItemCategorySchema>;
export const updateMetadataEnumSchema = z.object({
  name: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateMetadataEnumInput = z.infer<typeof updateMetadataEnumSchema>;

export const createMetadataEnumValueSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
  parentId: z.number().optional(),
});
export type CreateMetadataEnumValueInput = z.infer<typeof createMetadataEnumValueSchema>;
export const updateMetadataEnumValueSchema = z.object({
  name: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
  parentId: z.number().optional(),
});
export type UpdateMetadataEnumValueInput = z.infer<typeof updateMetadataEnumValueSchema>;

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});
export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});
export const googleAuthSchema = z.object({
  googleToken: z.string().min(1),
});
export const approveUserBodySchema = z.object({}).passthrough();
export const rejectUserBodySchema = z.object({}).passthrough();

export const profileUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileEmail: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  profession: z.string().optional(),
  age: z.number().optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const updateUserSchema = z.object({
  id: z.number().optional(),
  email: z.string().email().optional(),
  roleId: z.number().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const balanceAccountKindSchema = z.enum(['capital', 'partner_account', 'cash', 'other']);

export const createBalanceAccountSchema = z.object({
  name: z.string().min(1),
  kind: balanceAccountKindSchema,
  currency: z.string().min(1).max(10).optional(),
  notes: z.string().nullable().optional(),
});
export type CreateBalanceAccountInput = z.infer<typeof createBalanceAccountSchema>;

export const updateBalanceAccountSchema = z.object({
  name: z.string().min(1).optional(),
  kind: balanceAccountKindSchema.optional(),
  currency: z.string().min(1).max(10).optional(),
  notes: z.string().nullable().optional(),
  archived_at: z.string().nullable().optional(),
});
export type UpdateBalanceAccountInput = z.infer<typeof updateBalanceAccountSchema>;

export const createBalanceMovementSchema = z.object({
  occurred_on: z.string().min(1),
  amount: z.number(),
  label: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type CreateBalanceMovementInput = z.infer<typeof createBalanceMovementSchema>;

export const updateBalanceMovementSchema = z.object({
  occurred_on: z.string().min(1).optional(),
  amount: z.number().optional(),
  label: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type UpdateBalanceMovementInput = z.infer<typeof updateBalanceMovementSchema>;

export const allocateBankToBalanceSchema = z.object({
  balance_account_id: z.number().int().positive(),
  amount: z.number().optional(),
  label: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type AllocateBankToBalanceInput = z.infer<typeof allocateBankToBalanceSchema>;

const bankTxSplitLineBase = {
  amount: z.number().refine((v) => v !== 0, 'Amount cannot be zero'),
  notes: z.string().nullable().optional(),
};

export const bankTransactionSplitSchema = z.object({
  lines: z
    .array(
      z.discriminatedUnion('kind', [
        z.object({
          kind: z.literal('balance_movement'),
          ...bankTxSplitLineBase,
          balanceAccountId: z.number().int().positive(),
          label: z.string().nullable().optional(),
        }),
        z.object({
          kind: z.literal('payment'),
          ...bankTxSplitLineBase,
          entryId: z.number().int().positive(),
          paymentDate: z.string().min(1),
          paymentMethod: paymentMethodEnum.optional(),
        }),
        z.object({
          kind: z.literal('link_expense'),
          ...bankTxSplitLineBase,
          expenseId: z.number().int().positive(),
        }),
        z.object({
          kind: z.literal('link_sale'),
          ...bankTxSplitLineBase,
          saleId: z.number().int().positive(),
        }),
        z.object({
          kind: z.literal('new_expense'),
          ...bankTxSplitLineBase,
          expense: bankTransactionCreateExpenseBodySchema,
        }),
        z.object({
          kind: z.literal('new_sale'),
          ...bankTxSplitLineBase,
          sale: z.object({
            date: z.string().min(1),
            type: salesTypeEnum,
            lineItems: z.array(saleLineItemSchema).min(1),
            discount: transactionDiscountSchema.optional(),
            description: z.string().optional(),
          }),
        }),
      ])
    )
    .min(1, 'At least one line is required'),
});
export type BankTransactionSplitInput = z.infer<typeof bankTransactionSplitSchema>;
