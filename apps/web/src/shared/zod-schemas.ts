import { z } from "zod";
import { NextResponse } from "next/server";

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

export const createPaymentSchema = z.object({
  entryId: z.number().int().positive("Entry is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.number(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = createPaymentSchema.partial();
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
});

export const createExpenseTransactionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: expenseCategoryEnum,
  expenseDate: z.string().min(1, "Expense date is required"),
  description: z.string().optional(),
  supplierId: z.number().optional(),
  lineItems: z.array(expenseLineItemSchema).min(1, "At least one line item is required"),
  discount: transactionDiscountSchema.optional(),
});
export type CreateExpenseTransactionInput = z.infer<typeof createExpenseTransactionSchema>;

export const createExpenseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: expenseCategoryEnum,
  amount: z.number().min(0),
  expenseDate: z.string().min(1, "Expense date is required"),
  description: z.string().optional(),
  vendor: z.string().optional(),
  supplierId: z.number().optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = z.object({
  name: z.string().min(1).optional(),
  category: expenseCategoryEnum.optional(),
  amount: z.number().min(0).optional(),
  expenseDate: z.string().min(1).optional(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  supplierId: z.number().optional(),
  lineItems: z.array(expenseLineItemSchema).optional(),
  discount: transactionDiscountSchema.optional(),
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
});

export const createSaleTransactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: salesTypeEnum,
  lineItems: z.array(saleLineItemSchema).min(1, "At least one line item is required"),
  discount: transactionDiscountSchema.optional(),
  description: z.string().optional(),
});
export type CreateSaleTransactionInput = z.infer<typeof createSaleTransactionSchema>;

export const updateSaleTransactionSchema = z.object({
  date: z.string().min(1).optional(),
  type: salesTypeEnum.optional(),
  lineItems: z.array(saleLineItemSchema).optional(),
  discount: transactionDiscountSchema.optional(),
  description: z.string().optional(),
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
    unit: z.string().optional(),
    unitId: z.number().optional(),
    category: z.string().optional(),
    sku: z.string().optional(),
    unitPrice: z.number().optional(),
    unitCost: z.number().optional(),
    vendorId: z.number().optional(),
    notes: z.string().optional(),
    defaultTaxRatePercent: z.number().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => (typeof d.unit === "string" && d.unit.trim() !== "") || d.unitId != null, {
    message: "Provide either unit or unitId",
    path: ["unit"],
  });
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial().extend({
  producedFromRecipeId: z.number().nullable().optional(),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const createIngredientSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    unit: z.string().optional(),
    unitId: z.number().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    sku: z.string().optional(),
    unitPrice: z.number().optional(),
    unitCost: z.number().optional(),
    vendorId: z.number().optional(),
    notes: z.string().optional(),
    defaultTaxRatePercent: z.number().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => (typeof d.unit === "string" && d.unit.trim() !== "") || d.unitId != null, {
    message: "Unit is required",
    path: ["unit"],
  });
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

export const updateIngredientSchema = createIngredientSchema.partial().extend({
  producedFromRecipeId: z.number().nullable().optional(),
});
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

export const createUnitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  dimension: z.string().optional(),
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

const supplierTypeArraySchema = z.array(z.enum(["supplier", "vendor"])).optional();

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
});
export type CreateItemPriceHistoryInput = z.infer<typeof createItemPriceHistorySchema>;

export const updateItemPriceHistorySchema = z
  .object({
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    value: z.number().min(0).optional(),
  })
  .refine((d) => d.effectiveDate !== undefined || d.value !== undefined, {
    message: "No updates provided",
  });
export type UpdateItemPriceHistoryInput = z.infer<typeof updateItemPriceHistorySchema>;

const variableTypeEnum = z.enum(VARIABLE_TYPE_NAMES);
const variablePayloadSchema = z.record(z.string(), z.unknown()).optional();
export const createVariableSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    type: variableTypeEnum,
    value: z.number(),
    unitId: z.number().int().positive().nullable().optional(),
    unit: z.string().optional(),
    effectiveDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    payload: variablePayloadSchema,
  })
  .superRefine((data, ctx) => {
    if (data.type === "unit") {
      const payload = data.payload as Record<string, unknown> | undefined;
      if (!payload?.symbol || typeof payload.symbol !== "string" || !payload.symbol.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unit type requires payload.symbol", path: ["payload"] });
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
  ruleType: z.enum(["exemption", "reduction"]).optional(),
});
export type CreateTaxRuleInput = z.infer<typeof createTaxRuleSchema>;

export const updateTaxRuleSchema = createTaxRuleSchema.partial();
export type UpdateTaxRuleInput = z.infer<typeof updateTaxRuleSchema>;

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fiscalYearStart: z.string().min(1, "Fiscal year start is required"),
  budgetPeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
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
  salaryFrequency: z.enum(["yearly", "monthly", "weekly"]),
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
  paidDate: z.string().optional(),
  actualAmount: z.number().optional(),
  notes: z.string().optional(),
});
export const updateSubscriptionProjectionEntrySchema = z.object({
  month: z.string().optional(),
  amount: z.number().optional(),
  isPaid: z.boolean().optional(),
  paidDate: z.string().optional(),
  actualAmount: z.number().optional(),
  notes: z.string().optional(),
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
  unit: z.string().optional(),
  notes: z.string().optional(),
});
export const createRecipeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().optional(),
  unitId: z.number().optional(),
  category: z.string().optional(),
  servingSize: z.number().optional(),
  preparationTime: z.number().optional(),
  cookingTime: z.number().optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  producedItemId: z.number().nullable().optional(),
  items: z.array(recipeItemSchema).optional(),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export const updateRecipeSchema = createRecipeSchema.partial();
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const produceRecipeSchema = z.object({
  quantity: z.number().min(0.000001, "Quantity must be greater than 0"),
  location: z.string().optional(),
  notes: z.string().optional(),
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
const syncTypeEnum = z.enum(["orders", "payments", "catalog", "locations", "full"]);
export const syncBodySchema = z.object({
  sync_type: syncTypeEnum.optional(),
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
});
export type CreateMetadataEnumValueInput = z.infer<typeof createMetadataEnumValueSchema>;
export const updateMetadataEnumValueSchema = z.object({
  name: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
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
