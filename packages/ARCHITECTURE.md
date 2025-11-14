# Package Architecture Guide

## Overview

The monorepo is structured to maximize code reuse between web and mobile while maintaining platform-specific flexibility.

## Package Structure

### @smartlogbook/types
**Purpose:** Single source of truth for all shared types

**Contents:**
- User types (User, CreateUserData, UpdateUserData)
- Auth types (LoginCredentials, AuthResponse, SessionData)
- Object types (Object, CreateObjectData, UpdateObjectData)
- Any other shared domain types

**When to add:**
- Types used by multiple apps
- API request/response types
- Shared domain models

### @smartlogbook/api-client
**Purpose:** Platform-agnostic HTTP client

**Contents:**
- `ApiClient` class - main client interface
- `ApiAdapter` interface - adapter contract
- Example adapters (for reference)

**Key Design:**
- Uses adapter pattern to support different platforms
- Handles auth tokens, error handling, URL building
- Provides methods: `get`, `post`, `put`, `patch`, `delete`

### @smartlogbook/api
**Purpose:** Shared API endpoint definitions

**Contents:**
- Factory functions that create API modules
- All functions accept `ApiClient` instance
- Example: `createUsersApi(client)`, `createAuthApi(client)`

**Key Design:**
- Factory pattern makes APIs reusable across platforms
- Each API module is independent
- No platform-specific code

### @smartlogbook/shared
**Purpose:** Shared utilities and constants

**Contents:**
- URL utilities
- Constants
- Helper functions used across packages

## Usage Patterns

### In Web App

```typescript
// apps/web/src/lib/api/client.ts
import { ApiClient } from '@smartlogbook/api-client';
import { createWebAdapter } from './adapters/web';

export const apiClient = new ApiClient(createWebAdapter());

// apps/web/src/lib/api/index.ts
import { apiClient } from './client';
import { createUsersApi, createAuthApi } from '@smartlogbook/api';

export const usersApi = createUsersApi(apiClient);
export const authApi = createAuthApi(apiClient);
```

### In Mobile App

```typescript
// apps/mobile/src/lib/api/client.ts
import { ApiClient } from '@smartlogbook/api-client';
import { createMobileAdapter } from './adapters/mobile';

export const apiClient = new ApiClient(createMobileAdapter());

// apps/mobile/src/lib/api/index.ts
import { apiClient } from './client';
import { createUsersApi, createAuthApi } from '@smartlogbook/api';

export const usersApi = createUsersApi(apiClient);
export const authApi = createAuthApi(apiClient);
```

## Adding New Features

### Step 1: Add Types (if needed)
```typescript
// packages/types/src/locomotive.ts
export interface Locomotive {
  id: number;
  // ...
}
```

### Step 2: Add API Functions
```typescript
// packages/api/src/locomotives.ts
import type { ApiClient } from '@smartlogbook/api-client';
import type { Locomotive } from '@smartlogbook/types';

export function createLocomotivesApi(client: ApiClient) {
  return {
    async getLocomotives(): Promise<Locomotive[]> {
      return client.get<Locomotive[]>('/api/locomotives');
    },
    // ...
  };
}
```

### Step 3: Export from API Package
```typescript
// packages/api/src/index.ts
export { createLocomotivesApi } from './locomotives';
```

### Step 4: Use in Apps
```typescript
// Both apps can now use:
import { createLocomotivesApi } from '@smartlogbook/api';
const locomotivesApi = createLocomotivesApi(apiClient);
```

## Platform-Specific Code

Platform-specific code should stay in apps:

- **Storage:** localStorage (web) vs AsyncStorage (mobile)
- **Network:** fetch with different base URLs/configs
- **Routing:** Next.js routing vs Expo Router
- **UI Components:** Not shared (different renderers)

## Dependency Graph

```
apps/web ──────┐
               ├──> @smartlogbook/api ──> @smartlogbook/api-client ──> @smartlogbook/types
apps/mobile ───┘                        └──> @smartlogbook/shared
```

## Benefits

1. **Type Safety:** Single source of truth for types
2. **DRY:** API logic written once, used everywhere
3. **Consistency:** Same API interface across platforms
4. **Testability:** Easy to mock and test
5. **Maintainability:** Changes in one place affect all apps

