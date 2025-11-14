# Project Architecture Rules & Guidelines

This document defines the architectural patterns, rules, and conventions that must be followed when developing this application.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Page Patterns](#page-patterns)
4. [API Architecture](#api-architecture)
5. [Component Patterns](#component-patterns)
6. [State Management](#state-management)
7. [Code Organization](#code-organization)
8. [Development Rules](#development-rules)
9. [UI/UX Rules](#uiux-rules)
10. [Testing & Quality](#testing--quality)

---

## Architecture Overview

### Monorepo Structure
- **Workspace-based monorepo** using pnpm workspaces
- **Packages**: Shared code across apps (types, hooks, lib, ui, config)
- **Apps**: Platform-specific applications (web, mobile, pwa)

### Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **Internationalization**: next-intl
- **Mocking**: MSW (Mock Service Worker) for development

### Hybrid API Pattern
- **Development**: MSW intercepts API calls → Returns mock data
- **Production**: API routes process requests → Real backend integration
- **API Routes**: Contain business logic and can work in production
- **MSW**: Automatically disabled in production builds

---

## Project Structure

### Directory Organization
```
apps/
  web/                    # Next.js web application
    src/
      app/                # Next.js App Router pages
        api/              # API routes (business logic layer)
        [entity]/         # Entity management pages
          page.tsx        # List page
          create/         # Create page
          [id]/           # Detail/edit pages
      components/         # Reusable UI components
      hooks/              # Custom React hooks (if app-specific)
      lib/                # Utilities and API clients
      shared/             # Shared types and schemas
  mobile/                 # React Native mobile app
  pwa/                    # PWA application

packages/
  types/                 # Shared TypeScript types
  hooks/                 # Shared React hooks
  lib/                   # Shared utilities and API clients
  ui/                    # Shared UI components (shadcn/ui)
  config/                # Shared configuration
  shared/                 # Other shared code
```

### Key Principles
1. **Separation of Concerns**: Clear boundaries between layers
2. **Reusability**: Shared code in packages, app-specific in apps
3. **Type Safety**: Full TypeScript coverage
4. **Feature-based Organization**: Related code grouped together

---

## Page Patterns

### List Pages (DataTablePage Pattern)

**MUST FOLLOW THIS EXACT PATTERN:**

```typescript
// apps/web/src/app/[entity]/page.tsx
"use client";

import { DataTablePage } from "@/components/data-table-page";
import { use[Entity] } from "@smartlogbook/hooks";
import { ColumnDef } from "@tanstack/react-table";

export default function [Entity]Page() {
  const { data, isLoading } = use[Entity]();
  
  const columns: ColumnDef<[Entity]>[] = [
    // Define columns
  ];

  return (
    <DataTablePage
      title="[Entity]"
      description="Manage [entity]"
      createHref="/[entity]/create"
      data={data || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(item) => router.push(`/[entity]/${item.id}`)}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onBulkCopy={handleBulkCopy}
      onBulkExport={handleBulkExport}
      filterColumns={[
        { value: "field", label: "Field" }
      ]}
      sortColumns={[
        { value: "field", label: "Field", type: "character varying" }
      ]}
      localStoragePrefix="[entity]"
      searchFields={["field1", "field2"]}
    />
  );
}
```

**Required Features:**
- ✅ Advanced filtering system with localStorage persistence
- ✅ Complex bulk actions (copy, export, delete)
- ✅ Column visibility management
- ✅ Sorting with localStorage persistence
- ✅ Integrated action bar with conditional bulk actions
- ✅ Sophisticated filter rules with operators (equals, contains, starts_with, etc.)
- ✅ NO back buttons
- ✅ Consistent AppLayout usage (via DataTablePage)

### Create Pages (AppLayout Pattern)

**MUST FOLLOW THIS EXACT PATTERN:**

```typescript
// apps/web/src/app/[entity]/create/page.tsx
"use client";

import AppLayout from "@/components/app-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreate[Entity] } from "@smartlogbook/hooks";

const createSchema = z.object({
  // Define schema
});

export default function Create[Entity]Page() {
  const createMutation = useCreate[Entity]();
  const form = useForm({
    resolver: zodResolver(createSchema)
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Create [Entity]</h1>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Form fields */}
        </form>
      </div>
    </AppLayout>
  );
}
```

**Required Features:**
- ✅ NO back buttons
- ✅ Consistent form layout
- ✅ Toast notifications
- ✅ Proper validation with Zod
- ✅ Loading states
- ✅ Error handling

### Edit Pages (AppLayout Pattern)

**MUST FOLLOW THIS EXACT PATTERN:**

```typescript
// apps/web/src/app/[entity]/[id]/edit/page.tsx
"use client";

import AppLayout from "@/components/app-layout";
import { use[Entity]ById } from "@smartlogbook/hooks";
import { useForm } from "react-hook-form";

export default function Edit[Entity]Page({ params }: { params: { id: string } }) {
  const { data, isLoading } = use[Entity]ById(params.id);
  const updateMutation = useUpdate[Entity]();
  
  // Similar to create page but with initial values
}
```

**Required Features:**
- ✅ NO back buttons
- ✅ Loading states while fetching
- ✅ Pre-filled form with existing data
- ✅ Same validation as create page
- ✅ Toast notifications
- ✅ Error handling

### Detail Pages (AppLayout Pattern)

**MUST FOLLOW THIS EXACT PATTERN:**

```typescript
// apps/web/src/app/[entity]/[id]/page.tsx
"use client";

import AppLayout from "@/components/app-layout";
import { use[Entity]ById } from "@smartlogbook/hooks";

export default function [Entity]DetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = use[Entity]ById(params.id);
  
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Display entity details */}
        {/* Edit/Delete actions */}
      </div>
    </AppLayout>
  );
}
```

**Required Features:**
- ✅ NO back buttons
- ✅ Consistent layout
- ✅ Edit/Delete actions
- ✅ Related data links (if applicable)

---

## API Architecture

### API Routes Pattern

**MUST FOLLOW THIS EXACT PATTERN:**

```typescript
// apps/web/src/app/api/[entity]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Business logic here
  // In development: MSW intercepts
  // In production: This code executes
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Validation
  // Business logic
  return NextResponse.json(result, { status: 201 });
}
```

```typescript
// apps/web/src/app/api/[entity]/[id]/route.ts
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Fetch by ID
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  // Update logic
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Delete logic
  return NextResponse.json({}, { status: 204 });
}
```

**Key Rules:**
- ✅ API routes contain business logic
- ✅ Never use mock data directly in API routes
- ✅ MSW intercepts at network level
- ✅ Proper error handling
- ✅ Input validation
- ✅ Consistent response format

### API Client Pattern

**MUST FOLLOW THIS EXACT PATTERN:**

```typescript
// packages/lib/src/api/[entity].ts
import { apiRequest } from './api';

export const [entity]Api = {
  getAll: () => apiRequest<[Entity][]>('GET', '/api/[entity]'),
  getById: (id: string) => apiRequest<[Entity]>('GET', `/api/[entity]/${id}`),
  create: (data: Create[Entity]Data) => apiRequest<[Entity]>('POST', '/api/[entity]', data),
  update: (id: string, data: Update[Entity]Data) => apiRequest<[Entity]>('PUT', `/api/[entity]/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/[entity]/${id}`)
};
```

---

## Component Patterns

### AppLayout Component

**MUST BE USED ON ALL PAGES:**

```typescript
import AppLayout from "@/components/app-layout";

export default function MyPage() {
  return (
    <AppLayout>
      {/* Page content */}
    </AppLayout>
  );
}
```

**Features:**
- Role-based layout (admin, manager, user)
- Sidebar navigation
- Header with user info
- Responsive design

### DataTablePage Component

**MUST BE USED FOR ALL LIST PAGES:**

```typescript
<DataTablePage
  title="Title"
  description="Description"
  createHref="/create"
  data={data}
  columns={columns}
  loading={isLoading}
  onRowClick={handleRowClick}
  onDelete={handleDelete}
  onBulkDelete={handleBulkDelete}
  onBulkCopy={handleBulkCopy}
  onBulkExport={handleBulkExport}
  filterColumns={filterColumns}
  sortColumns={sortColumns}
  localStoragePrefix="entity"
  searchFields={["field1", "field2"]}
/>
```

**Features:**
- Advanced filtering with localStorage
- Bulk actions (copy, export, delete)
- Column visibility management
- Multi-level sorting
- Search functionality
- Server-side or client-side pagination

---

## State Management

### React Query Hooks Pattern

**MUST FOLLOW THIS EXACT PATTERN:**

```typescript
// packages/hooks/src/client/use[Entity].ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { [entity]Api } from '@smartlogbook/lib/api/[entity]';

export function use[Entity]() {
  return useQuery({
    queryKey: ['[entity]'],
    queryFn: [entity]Api.getAll
  });
}

export function use[Entity]ById(id: string) {
  return useQuery({
    queryKey: ['[entity]', id],
    queryFn: () => [entity]Api.getById(id),
    enabled: !!id
  });
}

export function useCreate[Entity]() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: [entity]Api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['[entity]'] });
    }
  });
}

export function useUpdate[Entity]() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update[Entity]Data }) => 
      [entity]Api.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['[entity]'] });
      queryClient.invalidateQueries({ queryKey: ['[entity]', variables.id] });
    }
  });
}

export function useDelete[Entity]() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: [entity]Api.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['[entity]'] });
    }
  });
}
```

**Key Rules:**
- ✅ Use React Query for all server state
- ✅ Proper cache invalidation
- ✅ Loading and error states
- ✅ Optimistic updates where appropriate

---

## Code Organization

### File Naming Conventions
- **Components**: PascalCase (e.g., `DataTablePage.tsx`)
- **Hooks**: camelCase starting with "use" (e.g., `useEntity.ts`)
- **API Clients**: camelCase (e.g., `entityApi.ts`)
- **Types**: PascalCase (e.g., `Entity.ts`)
- **Utils**: camelCase (e.g., `formatDate.ts`)

### Import Organization
```typescript
// 1. External dependencies
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal packages
import { useEntity } from '@smartlogbook/hooks';
import { Button } from '@smartlogbook/ui/button';

// 3. Local imports
import AppLayout from '@/components/app-layout';
import { entityApi } from '@/lib/api/entity';
```

### Type Definitions
- **Shared Types**: In `packages/types/src/`
- **App-specific Types**: In `apps/web/src/types/` or co-located
- **API Types**: Co-located with API clients or in shared types

---

## Development Rules

### CRITICAL RULES (MUST FOLLOW)

1. **NO MOCK DATA IN API ROUTES**
   - API routes must be normal and contain business logic
   - MSW intercepts at network level
   - Never hardcode mock data in API route handlers

2. **NO BACK BUTTONS IN PAGES**
   - All pages must use AppLayout
   - Navigation via sidebar or breadcrumbs only
   - No explicit back buttons

3. **SOPHISTICATED PATTERN FOR ALL LIST PAGES**
   - Advanced filtering with localStorage persistence
   - Complex bulk actions (copy, export, delete)
   - Column visibility management
   - Sorting with localStorage persistence
   - Integrated action bar with conditional bulk actions
   - Sophisticated filter rules with operators

4. **CONSISTENT FORM PATTERNS**
   - React Hook Form + Zod validation
   - Toast notifications for success/error
   - Loading states
   - Proper error handling

5. **TYPE SAFETY**
   - Full TypeScript coverage
   - No `any` types (use `unknown` if needed)
   - Proper type definitions for all entities

6. **CODE QUALITY**
   - Follow existing patterns exactly
   - Don't create new patterns without discussion
   - Reuse existing components
   - Keep functions small and focused

### Adding New Entities

**Step-by-step process:**

1. **Add Types** (`packages/types/src/[entity].ts`)
   ```typescript
   export interface Entity {
     id: number;
     // fields
   }
   
   export interface CreateEntityData {
     // fields
   }
   
   export interface UpdateEntityData {
     // fields
   }
   ```

2. **Add API Client** (`packages/lib/src/api/[entity].ts`)
   ```typescript
   export const entityApi = {
     getAll: () => apiRequest<Entity[]>('GET', '/api/entity'),
     // ... other methods
   };
   ```

3. **Add Hooks** (`packages/hooks/src/client/use[Entity].ts`)
   ```typescript
   export function useEntity() { /* ... */ }
   export function useCreateEntity() { /* ... */ }
   // ... other hooks
   ```

4. **Add API Routes** (`apps/web/src/app/api/[entity]/route.ts`)
   ```typescript
   export async function GET() { /* ... */ }
   export async function POST() { /* ... */ }
   ```

5. **Add Pages**
   - List page: `apps/web/src/app/[entity]/page.tsx`
   - Create page: `apps/web/src/app/[entity]/create/page.tsx`
   - Edit page: `apps/web/src/app/[entity]/[id]/edit/page.tsx`
   - Detail page: `apps/web/src/app/[entity]/[id]/page.tsx`

6. **Add to Navigation** (`packages/config/src/paths.config.ts`)
   ```typescript
   {
     title: "Entity",
     url: "/entity",
     icon: "IconName"
   }
   ```

7. **Add MSW Handlers** (if needed for development)
   ```typescript
   // packages/mocks/src/handlers/[entity].ts
   export const entityHandlers = [
     http.get('/api/entity', () => HttpResponse.json(mockData))
   ];
   ```

---

## UI/UX Rules

### Design System
- **Use shadcn/ui components** for all UI elements
- **Tailwind CSS** for styling
- **Consistent spacing** using Tailwind spacing scale
- **Dark mode support** via Tailwind dark mode

### Accessibility
- ✅ Proper ARIA labels
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Screen reader support

### Responsive Design
- ✅ Mobile-first approach
- ✅ Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- ✅ Touch-friendly targets (min 44x44px)

### Loading States
- ✅ Skeleton loaders for content
- ✅ Spinner for actions
- ✅ Disabled states during mutations

### Error Handling
- ✅ Toast notifications for errors
- ✅ Inline error messages for forms
- ✅ Graceful error boundaries
- ✅ User-friendly error messages

---

## Testing & Quality

### Code Quality Standards
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Prettier formatting
- ✅ No console.log in production code
- ✅ Proper error handling

### Testing Strategy
- ✅ Unit tests for utilities
- ✅ Integration tests for API routes
- ✅ Component tests for UI
- ✅ E2E tests for critical flows

### Performance
- ✅ Code splitting for large components
- ✅ React Query caching
- ✅ Image optimization
- ✅ Bundle size monitoring

---

## Migration & Backend Integration

### MSW to Real API Migration
1. Remove MSW handlers
2. Update API routes to call real backend
3. Update environment variables
4. Test all endpoints

### Environment Variables
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.example.com

# MSW Configuration (development only)
NEXT_PUBLIC_MSW_ENABLED=true
```

---

## Common Patterns Reference

### Form with Validation
```typescript
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email')
});

const form = useForm({
  resolver: zodResolver(schema)
});
```

### Toast Notifications
```typescript
import { useToast } from '@smartlogbook/hooks/use-toast';

const { toast } = useToast();

toast({
  title: "Success",
  description: "Entity created successfully"
});
```

### Error Handling
```typescript
try {
  await mutation.mutateAsync(data);
} catch (error) {
  toast({
    title: "Error",
    description: error.message,
    variant: "destructive"
  });
}
```

---

## Summary Checklist

When creating a new entity, ensure:
- ✅ Types defined in `packages/types`
- ✅ API client in `packages/lib/src/api`
- ✅ Hooks in `packages/hooks/src/client`
- ✅ API routes in `apps/web/src/app/api`
- ✅ Pages follow exact patterns (list, create, edit, detail)
- ✅ Added to navigation config
- ✅ MSW handlers (if needed)
- ✅ No mock data in API routes
- ✅ No back buttons
- ✅ Sophisticated filtering on list pages
- ✅ Proper validation on forms
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0

