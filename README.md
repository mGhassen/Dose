# Dose

Financial management and planning system.

## Architecture

This is a **monorepo** using pnpm workspaces with the following structure:

```
dose/
├── apps/
│   └── web/          # Next.js web application
├── packages/
│   ├── types/        # Shared TypeScript types and interfaces
│   ├── api-client/   # Universal API client with platform adapters
│   ├── api/          # Shared API endpoint definitions
│   └── shared/       # Shared utilities and constants
└── package.json      # Root workspace configuration
```

## Shared Packages

### @kit/types
Contains all shared TypeScript types and interfaces used across mobile and web applications.

**Usage:**
```typescript
import type { User, CreateUserData, AuthResponse } from '@kit/types';
```

### @kit/api-client
Universal API client that works with platform-specific adapters. Provides a consistent interface for making HTTP requests.

**Usage:**
```typescript
import { ApiClient } from '@kit/api-client';
import { createWebAdapter } from './adapters/web';

const adapter = createWebAdapter();
const client = new ApiClient(adapter);

const users = await client.get('/api/users');
```

### @kit/api
Shared API endpoint definitions. All functions are factories that accept an `ApiClient` instance.

**Usage:**
```typescript
import { ApiClient } from '@kit/api-client';
import { createUsersApi, createAuthApi } from '@kit/api';

const client = new ApiClient(adapter);
const usersApi = createUsersApi(client);
const authApi = createAuthApi(client);

const users = await usersApi.getUsers();
await authApi.login({ email, password });
```

### @kit/shared
Shared utilities and constants.

**Usage:**
```typescript
import { buildUrl, normalizeEndpoint } from '@kit/shared';
```

## Adding New Packages

1. Create a new directory under `packages/`
2. Add a `package.json` with the package name following `@kit/<name>`
3. Use `workspace:*` for internal dependencies
4. Update `pnpm-workspace.yaml` if needed (already includes `packages/*`)
5. Run `pnpm install` to link packages

## Development

### Installing Dependencies
```bash
pnpm install
```

### Running Apps
```bash
# Web
pnpm dev:web

# Mobile
pnpm dev:mobile
```

### Type Checking
```bash
# Check all packages
pnpm type-check:packages

# Check specific app
pnpm type-check:web
```

## Package Development

When working on shared packages:

1. Make changes to the package source
2. Changes are automatically available to consuming apps (no build step needed with TypeScript)
3. Run `pnpm type-check:packages` to verify types
4. Apps will pick up changes on hot reload

## Adding Shared Code

### Shared Types
Add new types to `packages/types/src/` and export from `packages/types/src/index.ts`.

### Shared API Endpoints
1. Add types to `packages/types/src/` if needed
2. Create API functions in `packages/api/src/`
3. Export from `packages/api/src/index.ts`
4. Use factory pattern: `create<Resource>Api(client: ApiClient)`

### Platform Adapters
Create platform-specific adapters in each app:
- Web: `apps/web/src/lib/api/adapters/web.ts`
- Mobile: `apps/mobile/src/lib/api/adapters/mobile.ts`

See example adapters in:
- `packages/api-client/src/adapters/web-adapter.example.ts`
- `packages/api-client/src/adapters/mobile-adapter.example.ts`

## Best Practices

1. **Keep packages small and focused** - Each package should have a single responsibility
2. **Use workspace dependencies** - Use `workspace:*` for internal packages
3. **Platform-specific code stays in apps** - Only truly shared code goes in packages
4. **Type everything** - Use TypeScript for all packages
5. **Factory pattern for APIs** - Makes APIs platform-agnostic
