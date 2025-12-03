// Export all lib utilities
export * from './utils';
export * from './config';
// Export only non-conflicting utilities from auth (getInitials, formatPhoneNumber)
export { getInitials, formatPhoneNumber } from './auth';
export * from './api';
// Don't export date functions from auth.ts as they conflict with date.ts and date-format.ts
// Export only unique functions from date.ts (not the ones that conflict with date-format.ts)
export { formatFrenchDate, formatRelativeTime, isToday, isPast, getDayName, getShortDayName } from './date';
// Export all from date-format.ts (this is the primary date formatting module that respects user preferences)
export * from './date-format';
export * from './localStorage';
export * from './queryClient';
export * from './status-mapping';
export * from './user-settings';
export * from './year-utils';

// Export all API modules
export * from './api/users';
// Don't export authApi from api/auth as it's already exported from api.ts
// Export other types and interfaces from api/auth
export type { LoginCredentials, RegisterData, AuthResponse, SessionData } from './api/auth';

// Export financial API modules
export * from './api/expenses';
export * from './api/subscriptions';
export * from './api/vendors';
export * from './api/items';
export * from './api/leasing';
export * from './api/loans';
export * from './api/variables';
export * from './api/personnel';
export * from './api/sales';
export * from './api/investments';
export * from './api/cash-flow';
export * from './api/working-capital';
export * from './api/profit-loss';
export * from './api/balance-sheet';
export * from './api/financial-plan';
export * from './api/financial-statement';
export * from './api/budgets';
export * from './api/dashboard';
export * from './api/actual-payments';
export * from './api/entries';
export * from './api/payments';

// Export inventory management API modules
export * from './api/ingredients';
export * from './api/recipes';
export * from './api/inventory-suppliers';
export * from './api/supplier-catalogs';
export * from './api/supplier-orders';
export * from './api/stock-levels';
export * from './api/stock-movements';
export * from './api/expiry-dates';

// Export metadata enums API
export * from './api/metadata-enums';

// Export Supabase client
export * from './supabase';
