# Shared Packages Summary

All hooks and libs from the web app have been moved to shared packages for reuse across web and mobile.

## Packages Created

### @smartlogbook/hooks
**Location:** `packages/hooks/`

Contains all React hooks:
- **Utility hooks:** `use-debounce`, `use-disclosure`, `use-mobile`
- **Data hooks:** All resource hooks (`useUsers`, `useObjects`, `useActions`, etc.)
- **Platform-specific hooks:** 
  - `use-auth.ts` - Uses Next.js router (needs adapter for mobile)
  - `use-date-format.ts` - Now platform-agnostic (uses `getUserSettings`)
  - `use-toast.ts` - Now platform-agnostic (types defined inline)
- **Server hooks:** Prefetch hooks in `server/` directory

**Dependencies:**
- `@smartlogbook/api` - For API and utilities
- `@smartlogbook/types` - For types
- `@tanstack/react-query` - For data fetching

### @smartlogbook/api
**Location:** `packages/lib/`

Contains all utility libraries:
- **Core utilities:** `utils.ts`, `config.ts`, `auth.ts`
- **API modules:** All API endpoint definitions in `api/` directory
- **Date utilities:** `date.ts`, `date-format.ts`
- **Storage:** `localStorage.ts`
- **Query client:** `queryClient.ts`, `queryClient.server.ts`
- **Other:** `status-mapping.ts`, `user-settings.ts`

**Note:** `queryClient.server.ts` contains Next.js-specific code (cookies from `next/headers`). This is expected for server-side prefetching.

## Import Changes

All imports have been updated:
- `@/lib/...` → `@smartlogbook/api/...`
- `@/hooks/...` → `@smartlogbook/hooks/...`

## Platform-Specific Notes

### use-auth.ts
Currently uses Next.js `useRouter`. For mobile, you'll need to:
1. Create a platform adapter that provides router-like functionality
2. Or create a mobile-specific version that uses React Navigation

### queryClient.server.ts
Contains Next.js-specific imports (`next/headers`). This is fine as it's only used for server-side prefetching in Next.js.

### Component Dependencies
- `use-toast.ts` - Now platform-agnostic (types defined inline)
- `use-date-format.ts` - Now uses `getUserSettings` directly instead of component provider

## Usage

### In Web App
```typescript
import { useUsers, useObjects } from '@smartlogbook/hooks';
import { usersApi, formatDate } from '@smartlogbook/api';
```

### In Mobile App
```typescript
import { useUsers, useObjects } from '@smartlogbook/hooks';
import { usersApi, formatDate } from '@smartlogbook/api';
```

## Next Steps

1. **Update web app imports** - Replace all `@/hooks/` and `@/lib/` imports with package imports
2. **Create mobile adapters** - For `use-auth.ts` router functionality
3. **Test** - Verify all hooks and libs work in both platforms

