// Export utility hooks
export * from './use-debounce';
export * from './use-disclosure';
export * from './use-mobile';
export * from './use-auth';
export * from './use-date-format';
export * from './use-toast';

// Export data hooks
export * from './client/useUsers';
export * from './client/useExpenses';
export * from './client/useExpensesAnalytics';
export * from './client/useSubscriptions';
export * from './client/useVendors';
export * from './client/useItems';
export * from './client/useLoans';
export * from './client/useLoansAnalytics';
export * from './client/useSales';
export * from './client/useSalesAnalytics';
export * from './client/usePersonnel';
export * from './client/usePersonnelAnalytics';
export * from './client/useLeasing';
export * from './client/useLeasingAnalytics';
export * from './client/useVariables';
export * from './client/useInvestments';
export * from './client/useInvestmentsAnalytics';
export * from './client/useProfitLoss';
export * from './client/useCashFlow';
export * from './client/useWorkingCapital';
export * from './client/useBalanceSheet';
export * from './client/useFinancialPlan';
export * from './client/useDashboard';
export * from './client/useBudgetProjections';
export * from './client/useBudgets';
export * from './client/useMetadataEnums';
export * from './client/useActualPayments';

// Export inventory management hooks
export * from './client/useIngredients';
export * from './client/useRecipes';
export * from './client/useInventorySuppliers';
export * from './client/useSupplierCatalogs';
export * from './client/useSupplierOrders';
export * from './client/useStockLevels';
export * from './client/useStockMovements';
export * from './client/useExpiryDates';

// Server-side hooks (Next.js specific) - exported for convenience
// Can also be imported directly: import { prefetchUsers } from '@kit/hooks/src/server/prefetchUsers';
export * from './server/prefetchUsers';
export * from './server/prefetchExpenses';
export * from './server/prefetchSubscriptions';
export * from './server/prefetchLoans';
export * from './server/prefetchSales';
export * from './server/prefetchPersonnel';
export * from './server/prefetchLeasing';
export * from './server/prefetchVariables';
export * from './server/prefetchInvestments';
export * from './server/prefetchProfitLoss';
export * from './server/prefetchCashFlow';
export * from './server/prefetchWorkingCapital';
export * from './server/prefetchBalanceSheet';
export * from './server/prefetchFinancialPlan';
export * from './server/prefetchDashboard';

// Platform-specific hooks (may need adapters for mobile)
// use-auth.ts - uses Next.js router
// use-date-format.ts - now platform-agnostic
// use-toast.ts - now platform-agnostic
