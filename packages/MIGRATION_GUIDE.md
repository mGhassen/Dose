# Migration Guide: Using Shared Packages

This guide shows how to migrate existing code to use the new shared packages.

## Quick Start

### 1. Install Packages in Your App

Add dependencies to your app's `package.json`:

**For Web (`apps/web/package.json`):**
```json
{
  "dependencies": {
    "@smartlogbook/types": "workspace:*",
    "@smartlogbook/api-client": "workspace:*",
    "@smartlogbook/api": "workspace:*"
  }
}
```

**For Mobile (`apps/mobile/package.json`):**
```json
{
  "dependencies": {
    "@smartlogbook/types": "workspace:*",
    "@smartlogbook/api-client": "workspace:*",
    "@smartlogbook/api": "workspace:*"
  }
}
```

Run `pnpm install` to link packages.

## Web App Migration

### Step 1: Create Web Adapter

Create `apps/web/src/lib/api/adapters/web.ts`:

```typescript
import type { ApiAdapter, HttpMethod, ApiRequestOptions } from '@smartlogbook/api-client';

export function createWebAdapter(baseUrl?: string): ApiAdapter {
  const API_BASE_URL = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

  async function getAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  async function setAuthToken(token: string | null): Promise<void> {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  async function request<T>(
    method: HttpMethod,
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    // Implementation from your existing apiRequest function
    // See packages/api-client/src/adapters/web-adapter.example.ts for full example
  }

  return {
    getAuthToken,
    setAuthToken,
    request,
    getBaseUrl: () => API_BASE_URL,
  };
}
```

### Step 2: Create API Client Instance

Create `apps/web/src/lib/api/client.ts`:

```typescript
import { ApiClient } from '@smartlogbook/api-client';
import { createWebAdapter } from './adapters/web';

export const apiClient = new ApiClient(createWebAdapter());
```

### Step 3: Create API Modules

Update `apps/web/src/lib/api/index.ts`:

```typescript
import { apiClient } from './client';
import { createUsersApi, createAuthApi, createObjectsApi } from '@smartlogbook/api';

export const usersApi = createUsersApi(apiClient);
export const authApi = createAuthApi(apiClient);
export const objectsApi = createObjectsApi(apiClient);
```

### Step 4: Update Imports

Replace direct API calls:

**Before:**
```typescript
import { usersApi } from '@/lib/api/users';
```

**After:**
```typescript
import { usersApi } from '@/lib/api';
import type { User } from '@smartlogbook/types';
```

## Mobile App Migration

### Step 1: Create Mobile Adapter

Create `apps/mobile/src/lib/api/adapters/mobile.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import type { ApiAdapter, HttpMethod, ApiRequestOptions } from '@smartlogbook/api-client';

export function createMobileAdapter(baseUrl?: string): ApiAdapter {
  // Implementation based on your existing mobile-api.ts
  // See packages/api-client/src/adapters/mobile-adapter.example.ts for full example
}
```

### Step 2: Create API Client Instance

Create `apps/mobile/src/lib/api/client.ts`:

```typescript
import { ApiClient } from '@smartlogbook/api-client';
import { createMobileAdapter } from './adapters/mobile';

export const apiClient = new ApiClient(createMobileAdapter());
```

### Step 3: Create API Modules

Update `apps/mobile/src/lib/api/index.ts`:

```typescript
import { apiClient } from './client';
import { createUsersApi, createAuthApi, createObjectsApi } from '@smartlogbook/api';

export const usersApi = createUsersApi(apiClient);
export const authApi = createAuthApi(apiClient);
export const objectsApi = createObjectsApi(apiClient);
```

## Adding More APIs

When you add new API endpoints:

1. **Add types to `packages/types/src/`** (if not exists)
2. **Create API in `packages/api/src/<resource>.ts`**
3. **Export from `packages/api/src/index.ts`**
4. **Use in both apps immediately**

Example - Adding Locomotives API:

```typescript
// packages/types/src/locomotive.ts
export interface Locomotive {
  id: number;
  code: string;
  // ...
}

// packages/api/src/locomotives.ts
import type { ApiClient } from '@smartlogbook/api-client';
import type { Locomotive } from '@smartlogbook/types';

export function createLocomotivesApi(client: ApiClient) {
  return {
    async getLocomotives(): Promise<Locomotive[]> {
      return client.get<Locomotive[]>('/api/locomotives');
    },
    // ... more methods
  };
}

// packages/api/src/index.ts
export { createLocomotivesApi } from './locomotives';

// Now both apps can use it:
import { createLocomotivesApi } from '@smartlogbook/api';
const locomotivesApi = createLocomotivesApi(apiClient);
```

## Benefits After Migration

✅ **Single source of truth** for types
✅ **DRY code** - API logic written once
✅ **Type safety** across platforms
✅ **Easier maintenance** - change once, affects all apps
✅ **Consistent API interface** across web and mobile

