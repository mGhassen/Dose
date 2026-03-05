// Financial Tracking System - Core Types and Models

// ============================================================================
// ENUMS
// ============================================================================

export enum ExpenseCategory {
  RENT = 'rent',
  UTILITIES = 'utilities',
  SUPPLIES = 'supplies',
  MARKETING = 'marketing',
  INSURANCE = 'insurance',
  MAINTENANCE = 'maintenance',
  PROFESSIONAL_SERVICES = 'professional_services',
  OTHER = 'other'
}

export enum ExpenseRecurrence {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export enum SalesType {
  ON_SITE = 'on_site', // CA sur place
  DELIVERY = 'delivery', // Livraison
  TAKEAWAY = 'takeaway', // À emporter
  CATERING = 'catering', // Traiteur
  OTHER = 'other'
}

export enum LoanStatus {
  ACTIVE = 'active',
  PAID_OFF = 'paid_off',
  DEFAULTED = 'defaulted'
}

export enum InvestmentType {
  EQUIPMENT = 'equipment',
  RENOVATION = 'renovation',
  TECHNOLOGY = 'technology',
  VEHICLE = 'vehicle',
  OTHER = 'other'
}

export enum DepreciationMethod {
  STRAIGHT_LINE = 'straight_line',
  DECLINING_BALANCE = 'declining_balance',
  UNITS_OF_PRODUCTION = 'units_of_production'
}

export enum VariableType {
  CHARGE = 'charge',
  COST = 'cost',
  TAX = 'tax',
  TRANSACTION_TAX = 'transaction_tax',
  INFLATION = 'inflation',
  EXCHANGE_RATE = 'exchange_rate',
  UNIT = 'unit',
  OTHER = 'other'
}

export enum PersonnelType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACTOR = 'contractor',
  INTERN = 'intern'
}

export enum LeasingType {
  OPERATING = 'operating',
  FINANCE = 'finance'
}

// ============================================================================
// SUBSCRIPTIONS (Abonnements récurrents)
// ============================================================================

export interface Subscription {
  id: number;
  name: string;
  category: ExpenseCategory;
  amount: number;
  recurrence: ExpenseRecurrence;
  startDate: string; // ISO date
  endDate?: string; // ISO date (optional for recurring)
  description?: string;
  vendor?: string; // Deprecated: use supplierId instead
  supplierId?: number; // Link to supplier (vendor type)
  defaultTaxRatePercent?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionData {
  name: string;
  category: ExpenseCategory;
  amount: number;
  recurrence: ExpenseRecurrence;
  startDate: string;
  endDate?: string;
  description?: string;
  vendor?: string; // Deprecated: use supplierId instead
  supplierId?: number; // Link to supplier (vendor type)
  defaultTaxRatePercent?: number;
  isActive?: boolean;
}

export interface UpdateSubscriptionData extends Partial<CreateSubscriptionData> {}

// ============================================================================
// VENDORS (Fournisseurs)
// ============================================================================

export interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateVendorData extends Partial<CreateVendorData> {}

// ============================================================================
// ITEMS (Articles/Produits) - See unified Item interface below
// ============================================================================
// Note: Item interface is defined later in the file with itemType support
// This section is kept for reference but the actual types are below

// ============================================================================
// EXPENSES (Charges d'exploitation - one-time or linked to subscription)
// ============================================================================

export interface ExpenseLineItem {
  id: number;
  expenseId: number;
  itemId?: number;
  subscriptionId?: number;
  quantity: number;
  unitId?: number;
  unitPrice: number;
  unitCost?: number;
  taxRatePercent?: number;
  taxAmount?: number;
  lineTotal: number;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  item?: Item;
  subscription?: { id: number; name: string };
}

export interface Expense {
  id: number;
  name: string;
  category: ExpenseCategory;
  amount: number;
  subscriptionId?: number;
  description?: string;
  vendor?: string;
  supplierId?: number;
  expenseDate: string;
  subtotal?: number;
  totalTax?: number;
  totalDiscount?: number;
  lineItems?: ExpenseLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseLineItemInput {
  itemId?: number;
  subscriptionId?: number;
  quantity: number;
  unitId?: number;
  unitPrice: number;
  unitCost?: number;
  taxRatePercent?: number;
}

export interface CreateExpenseData {
  name: string;
  category: ExpenseCategory;
  amount: number;
  subscriptionId?: number;
  description?: string;
  vendor?: string;
  supplierId?: number;
  expenseDate: string;
}

export interface CreateExpenseTransactionPayload {
  name: string;
  category: ExpenseCategory;
  expenseDate: string;
  description?: string;
  supplierId?: number;
  lineItems: ExpenseLineItemInput[];
  discount?: TransactionDiscount;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {}

export interface SubscriptionProjection {
  month: string; // YYYY-MM
  subscriptionId: number;
  subscriptionName: string;
  category: ExpenseCategory;
  amount: number;
  isProjected: boolean; // true if subscription payment hasn't occurred yet
}

/** Stored projection entry from API (includes payment fields) */
export interface SubscriptionProjectionEntry extends SubscriptionProjection {
  id?: string;
  isPaid?: boolean;
  paidDate?: string | null;
  actualAmount?: number | null;
  notes?: string | null;
}

export interface ExpenseProjection {
  month: string; // YYYY-MM
  expenseId: number;
  expenseName: string;
  category: ExpenseCategory;
  amount: number;
  isProjected: boolean; // true if expense hasn't occurred yet
}

export interface AnnualExpenseBudget {
  year: string; // YYYY
  month: string; // YYYY-MM
  totalByCategory: Record<ExpenseCategory, number>;
  totalExpenses: number;
  expenses: ExpenseProjection[];
}

export interface ExpenseProjectionSummary {
  year: string; // YYYY
  totalAnnual: number;
  monthlyAverage: number;
  byCategory: Record<ExpenseCategory, {
    total: number;
    monthlyAverage: number;
    count: number;
  }>;
  monthlyBreakdown: Array<{
    month: string; // YYYY-MM
    total: number;
    byCategory: Record<ExpenseCategory, number>;
  }>;
}

// ============================================================================
// LEASING PAYMENTS (Loyers)
// ============================================================================

export interface LeasingPayment {
  id: number;
  name: string;
  type: LeasingType;
  amount: number;
  startDate: string;
  endDate?: string;
  frequency: ExpenseRecurrence; // monthly, quarterly, yearly
  description?: string;
  lessor?: string; // Deprecated: use supplierId instead
  supplierId?: number; // Link to supplier (vendor type)
  isActive: boolean;
  offPaymentMonths?: number[]; // Array of month numbers (from start date) where no payment is made
  firstPaymentAmount?: number; // Optional different amount for the first payment
  totalAmount?: number; // Total amount to pay over the lease period. If set, amount is calculated from this.
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeasingPaymentData {
  name: string;
  type: LeasingType;
  amount?: number; // Required if totalAmount is not provided
  startDate: string;
  endDate?: string;
  frequency: ExpenseRecurrence;
  description?: string;
  lessor?: string; // Deprecated: use supplierId instead
  supplierId?: number; // Link to supplier (vendor type)
  isActive?: boolean;
  offPaymentMonths?: number[]; // Array of month numbers (from start date) where no payment is made
  firstPaymentAmount?: number; // Optional different amount for the first payment
  totalAmount?: number; // Total amount to pay. If provided, amount will be calculated from this, start date, end date, and frequency.
}

export interface UpdateLeasingPaymentData extends Partial<CreateLeasingPaymentData> {}

// ============================================================================
// LOANS (Emprunts)
// ============================================================================

export interface Loan {
  id: number;
  name: string;
  loanNumber: string; // Emprunt 1, 2, 3, etc.
  principalAmount: number;
  interestRate: number; // Annual percentage rate
  durationMonths: number;
  startDate: string;
  status: LoanStatus;
  lender?: string; // Deprecated: use supplierId instead
  supplierId?: number; // Link to supplier (vendor type)
  description?: string;
  offPaymentMonths?: number[]; // Array of month numbers where only interest is paid (no principal)
  createdAt: string;
  updatedAt: string;
}

export interface LoanScheduleEntry {
  id: number;
  loanId: number;
  month: number; // Month number (1, 2, 3...)
  paymentDate: string;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingBalance: number;
  isPaid: boolean;
  paidDate?: string;
}

export interface CreateLoanData {
  name: string;
  loanNumber: string;
  principalAmount: number;
  interestRate: number;
  durationMonths: number;
  startDate: string;
  status?: LoanStatus;
  lender?: string; // Deprecated: use supplierId instead
  supplierId?: number; // Link to supplier (vendor type)
  description?: string;
  offPaymentMonths?: number[]; // Array of month numbers where only interest is paid (no principal)
}

export interface UpdateLoanData extends Partial<CreateLoanData> {}

// ============================================================================
// VARIABLES (Variables de coût, taxes, inflation)
// ============================================================================

export interface VariablePayloadUnit {
  symbol?: string;
  dimension?: string;
  base_unit_id?: number | null;
}

export interface VariablePayloadTax {
  calculationType?: 'additive' | 'inclusive';
  applyToCustomAmounts?: boolean;
  defaultScopeType?: 'all' | 'items' | 'categories';
  defaultScopeItemIds?: number[] | null;
  defaultScopeCategories?: string[] | null;
}

export interface Variable {
  id: number;
  name: string;
  type: VariableType;
  value: number;
  unitId?: number | null;
  unit?: string;
  effectiveDate?: string | null;
  endDate?: string | null;
  description?: string;
  isActive: boolean;
  payload?: Record<string, unknown> | VariablePayloadUnit | VariablePayloadTax;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariableData {
  name: string;
  type: VariableType;
  value: number;
  unitId?: number | null;
  unit?: string;
  effectiveDate?: string | null;
  endDate?: string | null;
  description?: string;
  isActive?: boolean;
  payload?: Record<string, unknown> | VariablePayloadUnit | VariablePayloadTax;
}

export interface UpdateVariableData extends Partial<CreateVariableData> {}

// ============================================================================
// TAX RULES (when to apply which tax variable; conditions + scope)
// ============================================================================

export type TaxRuleConditionType = 'sales_type' | 'expense' | null;
export type TaxRuleScopeType = 'all' | 'items' | 'categories';
export type TaxRuleRuleType = 'exemption' | 'reduction';

export interface TaxRule {
  id: number;
  variableId: number;
  conditionType: TaxRuleConditionType;
  conditionValue: string | null;
  conditionValues: string[] | null;
  scopeType: TaxRuleScopeType;
  scopeItemIds: number[] | null;
  scopeCategories: string[] | null;
  priority: number;
  effectiveDate: string | null;
  endDate: string | null;
  name: string | null;
  description: string | null;
  applyToCustomAmounts: boolean;
  ruleType: TaxRuleRuleType;
  createdAt: string;
  updatedAt: string;
  variable?: Variable;
}

export interface CreateTaxRuleData {
  variableId: number;
  conditionType?: TaxRuleConditionType;
  conditionValue?: string | null;
  conditionValues?: string[] | null;
  scopeType?: TaxRuleScopeType;
  scopeItemIds?: number[] | null;
  scopeCategories?: string[] | null;
  priority?: number;
  effectiveDate?: string | null;
  endDate?: string | null;
  name?: string | null;
  description?: string | null;
  applyToCustomAmounts?: boolean;
  ruleType?: TaxRuleRuleType;
}

export interface UpdateTaxRuleData extends Partial<CreateTaxRuleData> {}

// ============================================================================
// PERSONNEL (Salaires et charges)
// ============================================================================

export interface Personnel {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  position: string;
  type: PersonnelType;
  baseSalary: number; // Always stored as monthly salary
  salaryFrequency: 'yearly' | 'monthly' | 'weekly'; // Frequency of the salary package
  employerCharges: number; // Charges patronales (calculated, always percentage)
  employerChargesType: 'percentage' | 'fixed'; // Always 'percentage' now
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Aggregate projection for reporting (used in profit/loss, etc.)
export interface PersonnelProjection {
  month: string; // YYYY-MM
  totalSalary: number;
  totalCharges: number;
  totalCost: number;
  headcount: number;
}

// Individual personnel salary projection (for timeline)
export interface PersonnelSalaryProjection {
  id?: number;
  personnelId: number;
  month: string; // YYYY-MM
  bruteSalary: number; // Gross salary before taxes
  netSalary: number; // Net salary after employee taxes
  socialTaxes: number; // Employee social contributions
  employerTaxes: number; // Employer charges/taxes
  netPaymentDate?: string; // Date when net salary is paid
  taxesPaymentDate?: string; // Date when taxes are paid
  isProjected: boolean;
  isNetPaid: boolean; // Whether net salary payment is completed
  isTaxesPaid: boolean; // Whether taxes payment is completed
  netPaidDate?: string; // Actual date net salary was paid
  taxesPaidDate?: string; // Actual date taxes were paid
  actualNetAmount?: number; // Actual net amount paid (if different from projected)
  actualTaxesAmount?: number; // Actual taxes amount paid (if different from projected)
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePersonnelSalaryProjectionData {
  personnelId: number;
  month: string;
  bruteSalary: number;
  netSalary: number;
  socialTaxes?: number;
  employerTaxes?: number;
  netPaymentDate?: string;
  taxesPaymentDate?: string;
  isProjected?: boolean;
  isNetPaid?: boolean;
  isTaxesPaid?: boolean;
  netPaidDate?: string;
  taxesPaidDate?: string;
  actualNetAmount?: number;
  actualTaxesAmount?: number;
  notes?: string;
}

export interface UpdatePersonnelSalaryProjectionData extends Partial<CreatePersonnelSalaryProjectionData> {}

export interface CreatePersonnelData {
  firstName: string;
  lastName: string;
  email?: string;
  position: string;
  type: PersonnelType;
  baseSalary: number; // Input salary (will be converted to monthly)
  salaryFrequency: 'yearly' | 'monthly' | 'weekly'; // Frequency of input salary
  employerCharges: number; // Calculated from baseSalary and social security rate
  employerChargesType: 'percentage' | 'fixed'; // Always 'percentage'
  startDate: string;
  endDate?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdatePersonnelData extends Partial<CreatePersonnelData> {}

// ============================================================================
// SALES (CA - Chiffre d'affaires) / TRANSACTIONS
// ============================================================================

export interface SalesTaxRate {
  id: number;
  name: string;
  ratePercent: number;
  salesType: SalesType | string;
  effectiveDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseTaxRate {
  id: number;
  name: string;
  ratePercent: number;
  expenseCategory: ExpenseCategory | string;
  effectiveDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleLineItem {
  id: number;
  saleId: number;
  itemId?: number;
  quantity: number;
  unitId?: number;
  unitPrice: number;
  unitCost?: number;
  taxRatePercent?: number;
  taxAmount?: number;
  lineTotal: number;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  item?: Item;
}

export interface Sale {
  id: number;
  date: string;
  type: SalesType;
  amount: number;
  quantity?: number;
  unit?: string;
  unitId?: number;
  description?: string;
  itemId?: number;
  unitPrice?: number;
  unitCost?: number;
  subtotal?: number;
  totalTax?: number;
  totalDiscount?: number;
  createdAt: string;
  updatedAt: string;
  item?: Item;
  lineItems?: SaleLineItem[];
}

export interface SalesSummary {
  month: string; // YYYY-MM
  onSite: number;
  delivery: number;
  takeaway: number;
  catering: number;
  other: number;
  total: number;
}

export interface CreateSaleData {
  date: string;
  type: SalesType;
  amount: number;
  quantity?: number;
  unit?: string;
  unitId?: number;
  description?: string;
  itemId?: number;
  unitPrice?: number;
  unitCost?: number;
  subtotal?: number;
  totalTax?: number;
  totalDiscount?: number;
  lineItems?: SaleLineItemInput[];
  discount?: TransactionDiscount;
}

export interface SaleLineItemInput {
  itemId?: number;
  quantity: number;
  unitId?: number;
  unitPrice: number;
  unitCost?: number;
  taxRatePercent?: number;
}

export interface TransactionDiscount {
  type: 'amount' | 'percent';
  value: number;
}

export interface CreateTransactionPayload {
  date: string;
  type: SalesType;
  lineItems: SaleLineItemInput[];
  discount?: TransactionDiscount;
  description?: string;
}

export interface UpdateSaleData extends Partial<CreateSaleData> {}

// ============================================================================
// INVESTMENTS (Investissements)
// ============================================================================

export interface Investment {
  id: number;
  name: string;
  type: InvestmentType;
  amount: number;
  purchaseDate: string;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  residualValue: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepreciationEntry {
  id: number;
  investmentId: number;
  month: string; // YYYY-MM
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface CreateInvestmentData {
  name: string;
  type: InvestmentType;
  amount: number;
  purchaseDate: string;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  residualValue: number;
  description?: string;
}

export interface UpdateInvestmentData extends Partial<CreateInvestmentData> {}

// ============================================================================
// CASH FLOW (Trésorerie)
// ============================================================================

export interface CashFlowEntry {
  id: number;
  month: string; // YYYY-MM
  openingBalance: number;
  cashInflows: number;
  cashOutflows: number;
  netCashFlow: number;
  closingBalance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCashFlowEntryData {
  month: string;
  openingBalance: number;
  cashInflows: number;
  cashOutflows: number;
  notes?: string;
}

export interface UpdateCashFlowEntryData extends Partial<CreateCashFlowEntryData> {}

// ============================================================================
// WORKING CAPITAL / BFR (Besoin en Fonds de Roulement)
// ============================================================================

export interface WorkingCapital {
  id: number;
  month: string; // YYYY-MM
  accountsReceivable: number; // Créances clients
  inventory: number; // Stocks
  accountsPayable: number; // Dettes fournisseurs
  otherCurrentAssets: number;
  otherCurrentLiabilities: number;
  workingCapitalNeed: number; // BFR
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkingCapitalData {
  month: string;
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
  otherCurrentAssets?: number;
  otherCurrentLiabilities?: number;
}

export interface UpdateWorkingCapitalData extends Partial<CreateWorkingCapitalData> {}

// ============================================================================
// PROFIT AND LOSS / CR (Compte de Résultat)
// ============================================================================

export interface ProfitAndLoss {
  id: number;
  month: string; // YYYY-MM
  // Revenue
  totalRevenue: number;
  // Expenses
  costOfGoodsSold: number;
  operatingExpenses: number;
  personnelCosts: number;
  leasingCosts: number;
  depreciation: number;
  interestExpense: number;
  taxes: number;
  otherExpenses: number;
  // Totals
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  // Auto-computed fields
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfitAndLossData {
  month: string;
  totalRevenue: number;
  costOfGoodsSold?: number;
  operatingExpenses?: number;
  personnelCosts?: number;
  leasingCosts?: number;
  depreciation?: number;
  interestExpense?: number;
  taxes?: number;
  otherExpenses?: number;
}

export interface UpdateProfitAndLossData extends Partial<CreateProfitAndLossData> {}

// ============================================================================
// BALANCE SHEET / BILAN
// ============================================================================

export interface BalanceSheet {
  id: number;
  month: string; // YYYY-MM
  // Assets
  currentAssets: number;
  fixedAssets: number;
  intangibleAssets: number;
  totalAssets: number;
  // Liabilities
  currentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number;
  // Equity
  shareCapital: number;
  retainedEarnings: number;
  totalEquity: number;
  // Auto-computed: totalAssets = totalLiabilities + totalEquity
  createdAt: string;
  updatedAt: string;
}

export interface CreateBalanceSheetData {
  month: string;
  currentAssets: number;
  fixedAssets: number;
  intangibleAssets?: number;
  currentLiabilities: number;
  longTermDebt: number;
  shareCapital: number;
  retainedEarnings?: number;
}

export interface UpdateBalanceSheetData extends Partial<CreateBalanceSheetData> {}

// ============================================================================
// FINANCIAL PLAN (Plan de Financement)
// ============================================================================

export interface FinancialPlan {
  id: number;
  month: string; // YYYY-MM
  // Sources of funds
  equity: number;
  loans: number;
  otherSources: number;
  totalSources: number;
  // Uses of funds
  investments: number;
  workingCapital: number;
  loanRepayments: number;
  otherUses: number;
  totalUses: number;
  // Balance
  netFinancing: number; // totalSources - totalUses
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialPlanData {
  month: string;
  equity?: number;
  loans?: number;
  otherSources?: number;
  investments?: number;
  workingCapital?: number;
  loanRepayments?: number;
  otherUses?: number;
}

export interface UpdateFinancialPlanData extends Partial<CreateFinancialPlanData> {}

// ============================================================================
// BUDGETS
// ============================================================================

export interface Budget {
  id: number;
  name: string;
  fiscalYearStart: string; // YYYY-MM
  budgetPeriod: 'monthly' | 'quarterly' | 'yearly';
  reportingTagId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAccount {
  id: number;
  budgetId: number;
  accountPath: string; // Hierarchical path like "Profit and Loss/Income/Income/New subscription"
  accountLabel: string; // Display label
  accountType: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
  level: number; // Hierarchy level (0 = root)
  parentPath?: string | null;
  isGroup: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetEntry {
  id: number;
  budgetId: number;
  accountPath: string;
  month: string; // YYYY-MM
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetWithData extends Budget {
  accounts: BudgetAccount[];
  entries: BudgetEntry[];
}

export interface CreateBudgetData {
  name: string;
  fiscalYearStart: string;
  budgetPeriod?: 'monthly' | 'quarterly' | 'yearly';
  reportingTagId?: number | null;
}

export interface UpdateBudgetData extends Partial<CreateBudgetData> {}

export interface CreateBudgetAccountData {
  budgetId: number;
  accountPath: string;
  accountLabel: string;
  accountType: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
  level: number;
  parentPath?: string | null;
  isGroup?: boolean;
  displayOrder?: number;
}

export interface UpdateBudgetAccountData extends Partial<CreateBudgetAccountData> {}

export interface CreateBudgetEntryData {
  budgetId: number;
  accountPath: string;
  month: string;
  amount: number;
}

export interface UpdateBudgetEntryData extends Partial<CreateBudgetEntryData> {}

// ============================================================================
// DASHBOARD KPIs
// ============================================================================

export interface FinancialKPIs {
  // Revenue
  totalRevenue: number;
  revenueGrowth: number; // percentage
  // Expenses
  totalExpenses: number;
  expenseRatio: number; // percentage of revenue
  // Profitability
  grossProfit: number;
  grossMargin: number; // percentage
  netProfit: number;
  netMargin: number; // percentage
  // Cash Flow
  cashBalance: number;
  cashFlow: number;
  // Working Capital
  workingCapital: number;
  // Loans
  totalDebt: number;
  debtService: number; // monthly payments
  // Personnel
  totalPersonnelCost: number;
  headcount: number;
  // Period
  period: string; // YYYY-MM or YYYY
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

// ============================================================================
// ITEMS (replaces ingredients - can be regular items or recipes)
// ============================================================================

export type ItemType = 'item' | 'recipe';

export interface Item {
  id: number;
  name: string;
  description?: string;
  unit: string;
  unitId?: number;
  category?: string;
  itemType: ItemType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Item-specific fields (only when itemType === 'item')
  sku?: string;
  unitPrice?: number;   // Selling price
  unitCost?: number;    // Buying/cost price (for recipe cost, etc.)
  vendorId?: number;
  notes?: string;
  producedFromRecipeId?: number; // ID of recipe that produced this item
  defaultTaxRatePercent?: number; // Default tax % when item is added to sale/expense line (user can override)
  // Recipe-specific fields (only when itemType === 'recipe')
  servingSize?: number;
  preparationTime?: number;
  cookingTime?: number;
  instructions?: string;
}

export interface CreateItemData {
  name: string;
  description?: string;
  unit?: string;
  unitId?: number;
  category?: string;
  sku?: string;
  unitPrice?: number;
  unitCost?: number;
  vendorId?: number;
  notes?: string;
  defaultTaxRatePercent?: number;
  isActive?: boolean;
  // Note: Recipes are created via CreateRecipeData, not CreateItemData
  // Items table only stores regular inventory items
}

export interface UpdateItemData extends Partial<CreateItemData> {
  producedFromRecipeId?: number | null;
}

// Legacy aliases for backward compatibility during migration
export type Ingredient = Item;
export type CreateIngredientData = CreateItemData;
export type UpdateIngredientData = UpdateItemData;

// ============================================================================
// RECIPES (now a type of Item)
// ============================================================================

// Recipe is now just an Item with itemType='recipe'
export type Recipe = Item & {
  itemType: 'recipe';
  producedItemId?: number | null;
  /** Linked output items (from recipe_produced_items). Use this for produce-dialog logic. */
  producedItems?: Item[];
};

export interface RecipeItem {
  id: number;
  recipeId: number;
  itemId: number; // Can reference either items or recipes (nested recipes)
  quantity: number;
  unit: string;
  unitId?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  item?: Item; // Can be either a regular item or another recipe
}

export interface RecipeWithItems extends Recipe {
  items: RecipeItem[];
}

export interface CreateRecipeData {
  name: string;
  description?: string;
  unit?: string;
  unitId?: number;
  category?: string;
  servingSize?: number;
  preparationTime?: number;
  cookingTime?: number;
  instructions?: string;
  notes?: string;
  isActive?: boolean;
  producedItemId?: number | null;
  producedItemIds?: number[];
  items?: Array<{
    itemId: number; // Can be item or recipe ID
    quantity: number;
    unit: string;
    unitId?: number;
    notes?: string;
  }>;
}

export interface UpdateRecipeData extends Partial<CreateRecipeData> {}

/** Payload for POST /api/recipes/[id]/produce */
export interface ProduceRecipeData {
  quantity: number;
  location?: string;
  notes?: string;
  /** Required when recipe has multiple linked produced items. */
  producedItemId?: number;
  /** Required when recipe has 0 linked items (name for the new item to create). */
  producedItemName?: string;
}

export interface CreateRecipeItemData {
  recipeId: number;
  itemId: number;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface UpdateRecipeItemData extends Partial<CreateRecipeItemData> {}

// Legacy aliases for backward compatibility
export type RecipeIngredient = RecipeItem;
export type RecipeWithIngredients = RecipeWithItems;
export type CreateRecipeIngredientData = CreateRecipeItemData;
export type UpdateRecipeIngredientData = UpdateRecipeItemData;

// ============================================================================
// SUPPLIERS
// ============================================================================

export type SupplierType = 'supplier' | 'vendor';

export interface Supplier {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  paymentTerms?: string;
  notes?: string;
  supplierType: SupplierType[]; // Can be ['supplier'], ['vendor'], or ['supplier', 'vendor']
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  paymentTerms?: string;
  notes?: string;
  supplierType?: SupplierType[]; // Defaults to ['supplier']
  isActive?: boolean;
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {}

// ============================================================================
// SUPPLIER CATALOGS - REMOVED
// ============================================================================

// ============================================================================
// SUPPLIER ORDERS
// ============================================================================

export enum SupplierOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface SupplierOrderItem {
  id: number;
  orderId: number;
  itemId: number;
  quantity: number;
  unit: string;
  unitId?: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  item?: Item;
}

export interface SupplierOrder {
  id: number;
  supplierId: number;
  orderNumber?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: SupplierOrderStatus;
  totalAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  supplier?: Supplier;
  items?: SupplierOrderItem[];
}

export interface CreateSupplierOrderData {
  supplierId: number;
  orderNumber?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  status?: SupplierOrderStatus;
  notes?: string;
  items: Array<{
    itemId: number;
    quantity: number;
    unit: string;
    unitId?: number;
    unitPrice: number;
    notes?: string;
  }>;
}

export interface UpdateSupplierOrderData extends Partial<Omit<CreateSupplierOrderData, 'items'>> {
  items?: Array<{
    id?: number;
    itemId: number;
    quantity: number;
    unit: string;
    unitId?: number;
    unitPrice: number;
    notes?: string;
  }>;
}

export interface CreateSupplierOrderItemData {
  orderId: number;
  itemId: number;
  quantity: number;
  unit: string;
  unitId?: number;
  unitPrice: number;
  notes?: string;
}

export interface UpdateSupplierOrderItemData extends Partial<CreateSupplierOrderItemData> {}

// ============================================================================
// STOCK LEVELS
// ============================================================================

export interface StockLevel {
  id: number;
  itemId: number;
  quantity: number;
  unit: string;
  unitId?: number;
  location?: string;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  item?: Item;
}

export interface CreateStockLevelData {
  itemId: number;
  quantity: number;
  unit: string;
  unitId?: number;
  location?: string;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
}

export interface UpdateStockLevelData extends Partial<CreateStockLevelData> {}

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export enum StockMovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  WASTE = 'waste',
  EXPIRED = 'expired'
}

export enum StockMovementReferenceType {
  SUPPLIER_ORDER = 'supplier_order',
  RECIPE = 'recipe',
  MANUAL = 'manual',
  WASTE = 'waste',
  EXPIRY = 'expiry',
  SALE = 'sale'
}

export interface StockMovement {
  id: number;
  itemId: number;
  movementType: StockMovementType;
  quantity: number;
  unit: string;
  unitId?: number;
  referenceType?: StockMovementReferenceType;
  referenceId?: number;
  location?: string;
  notes?: string;
  movementDate: string;
  createdBy?: number;
  createdAt: string;
  // Populated fields
  item?: Item;
}

export interface CreateStockMovementData {
  itemId: number;
  movementType: StockMovementType;
  quantity: number;
  unit: string;
  unitId?: number;
  referenceType?: StockMovementReferenceType;
  referenceId?: number;
  location?: string;
  notes?: string;
  movementDate?: string;
}

export interface UpdateStockMovementData extends Partial<CreateStockMovementData> {}

// ============================================================================
// EXPIRY DATES
// ============================================================================

export interface ExpiryDate {
  id: number;
  itemId: number;
  stockMovementId?: number;
  quantity: number;
  unit: string;
  unitId?: number;
  expiryDate: string;
  location?: string;
  isExpired: boolean;
  disposedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  item?: Item;
}

export interface CreateExpiryDateData {
  itemId: number;
  stockMovementId?: number;
  quantity: number;
  unit: string;
  unitId?: number;
  expiryDate: string;
  location?: string;
  notes?: string;
}

export interface UpdateExpiryDateData extends Partial<CreateExpiryDateData> {
  disposedDate?: string;
}

// ============================================================================
// UPDATE ITEM TYPE
// ============================================================================

// Extended Item interface with populated recipe
export interface ItemWithRecipe extends Item {
  recipe?: Recipe;
}

