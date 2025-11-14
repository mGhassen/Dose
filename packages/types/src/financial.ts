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
  COST = 'cost',
  TAX = 'tax',
  INFLATION = 'inflation',
  EXCHANGE_RATE = 'exchange_rate',
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
// EXPENSES (Charges d'exploitation)
// ============================================================================

export interface Expense {
  id: number;
  name: string;
  category: ExpenseCategory;
  amount: number;
  recurrence: ExpenseRecurrence;
  startDate: string; // ISO date
  endDate?: string; // ISO date (optional for recurring)
  description?: string;
  vendor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseData {
  name: string;
  category: ExpenseCategory;
  amount: number;
  recurrence: ExpenseRecurrence;
  startDate: string;
  endDate?: string;
  description?: string;
  vendor?: string;
  isActive?: boolean;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {}

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
  lessor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeasingPaymentData {
  name: string;
  type: LeasingType;
  amount: number;
  startDate: string;
  endDate?: string;
  frequency: ExpenseRecurrence;
  description?: string;
  lessor?: string;
  isActive?: boolean;
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
  lender?: string;
  description?: string;
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
  lender?: string;
  description?: string;
}

export interface UpdateLoanData extends Partial<CreateLoanData> {}

// ============================================================================
// VARIABLES (Variables de coût, taxes, inflation)
// ============================================================================

export interface Variable {
  id: number;
  name: string;
  type: VariableType;
  value: number;
  unit?: string; // percentage, amount, etc.
  effectiveDate: string;
  endDate?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariableData {
  name: string;
  type: VariableType;
  value: number;
  unit?: string;
  effectiveDate: string;
  endDate?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateVariableData extends Partial<CreateVariableData> {}

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
  baseSalary: number;
  employerCharges: number; // Charges patronales (% or fixed)
  employerChargesType: 'percentage' | 'fixed';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonnelProjection {
  month: string; // YYYY-MM
  totalSalary: number;
  totalCharges: number;
  totalCost: number;
  headcount: number;
}

export interface CreatePersonnelData {
  firstName: string;
  lastName: string;
  email?: string;
  position: string;
  type: PersonnelType;
  baseSalary: number;
  employerCharges: number;
  employerChargesType: 'percentage' | 'fixed';
  startDate: string;
  endDate?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdatePersonnelData extends Partial<CreatePersonnelData> {}

// ============================================================================
// SALES (CA - Chiffre d'affaires)
// ============================================================================

export interface Sale {
  id: number;
  date: string;
  type: SalesType;
  amount: number;
  quantity?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
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

