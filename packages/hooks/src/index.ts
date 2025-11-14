// Export utility hooks
export * from './use-debounce';
export * from './use-disclosure';
export * from './use-mobile';
export * from './use-auth';
export * from './use-date-format';
export * from './use-toast';

// Export data hooks
export * from './client/useUsers';

// Server-side hooks (Next.js specific) - exported for convenience
// Can also be imported directly: import { prefetchUsers } from '@smartlogbook/hooks/src/server/prefetchUsers';
export * from './server/prefetchUsers';

// Platform-specific hooks (may need adapters for mobile)
// use-auth.ts - uses Next.js router
// use-date-format.ts - now platform-agnostic
// use-toast.ts - now platform-agnostic
