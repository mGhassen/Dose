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
import { use[Entity] } from "@kit/hooks";
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
import { useCreate[Entity] } from "@kit/hooks";

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
import { use[Entity]ById } from "@kit/hooks";
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
import { use[Entity]ById } from "@kit/hooks";

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
import { [entity]Api } from '@kit/lib/api/[entity]';

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
import { useEntity } from '@kit/hooks';
import { Button } from '@kit/ui/button';

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
import { useToast } from '@kit/hooks/use-toast';

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

## Financial Tracking Application - Restaurant Budgeting System

### Application Overview

**Dose** is a modern budgeting and financial-tracking platform for restaurant management. The application imports, stores, computes, and visualizes all financial data from Excel workbooks through structured data models, automated calculations, dashboards, and CRUD interfaces.

**Technology Stack:**
- **Backend**: Next.js 15 API Routes
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Next.js 15 (App Router) + React 19
- **State Management**: React Query (TanStack Query)
- **UI**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts

**Key Principle**: **Do calculations in code, not in database**. Use Supabase for data storage and retrieval only. All business logic, calculations, and computations happen in Next.js API routes or client-side code.

---

## Financial Data Models

### 1. Expenses (Charges d'exploitation)

**Purpose**: Track all operational expenses

**Model**:
```typescript
interface Expense {
  id: number;
  name: string;
  category: ExpenseCategory; // rent, utilities, supplies, marketing, etc.
  amount: number;
  recurrence: ExpenseRecurrence; // one_time, monthly, quarterly, yearly, custom
  startDate: string;
  endDate?: string;
  description?: string;
  vendor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Relations**:
- None (standalone entity)

**Enums**:
- `ExpenseCategory`: rent, utilities, supplies, marketing, insurance, maintenance, professional_services, other
- `ExpenseRecurrence`: one_time, monthly, quarterly, yearly, custom

**Features**:
- CRUD operations
- Category-based filtering
- Monthly recurring rules
- Auto-sum by category (calculated in code)
- **Annual budgeting projections** - Project all expenses for a full year based on recurrence patterns
- Monthly expense projections

**API Routes**:
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses?category={category}` - Filter by category
- `GET /api/expenses?month={YYYY-MM}` - Get expenses for specific month
- `GET /api/expenses/:id` - Get expense by ID
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/projections?year={YYYY}` - Get all expense projections for a year
- `GET /api/expenses/projections?start={YYYY-MM}&end={YYYY-MM}` - Get projections for date range
- `GET /api/expenses/annual-budget?year={YYYY}` - Get annual budget breakdown by month
- `GET /api/expenses/projection-summary?year={YYYY}` - Get annual projection summary with totals and averages

---

### 2. Leasing Payments (Loyers)

**Purpose**: Track lease/rent payments

**Model**:
```typescript
interface LeasingPayment {
  id: number;
  name: string;
  type: LeasingType; // operating, finance
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
```

**Relations**:
- None (standalone entity)

**Enums**:
- `LeasingType`: operating, finance
- `ExpenseRecurrence`: monthly, quarterly, yearly

**API Routes**:
- Standard CRUD: `/api/leasing`

---

### 3. Loans (Emprunts)

**Purpose**: Track multiple loans with amortization schedules

**Model**:
```typescript
interface Loan {
  id: number;
  name: string;
  loanNumber: string; // "Emprunt 1", "Emprunt 2", "Emprunt 3"
  principalAmount: number;
  interestRate: number; // Annual percentage rate
  durationMonths: number;
  startDate: string;
  status: LoanStatus; // active, paid_off, defaulted
  lender?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface LoanScheduleEntry {
  id: number;
  loanId: number;
  month: number; // 1, 2, 3...
  paymentDate: string;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingBalance: number;
  isPaid: boolean;
  paidDate?: string;
}
```

**Relations**:
- `Loan` 1:N `LoanScheduleEntry` (one loan has many schedule entries)

**Enums**:
- `LoanStatus`: active, paid_off, defaulted

**Features**:
- Automatic repayment table generation (calculated in code)
- Monthly amortization schedule
- Track payment status
- Separate modules for Emprunt 1, 2, 3, etc.

**Calculation Logic** (in code):
```typescript
// Monthly payment calculation (annuity formula)
const monthlyRate = interestRate / 12 / 100;
const monthlyPayment = principalAmount * 
  (monthlyRate * Math.pow(1 + monthlyRate, durationMonths)) / 
  (Math.pow(1 + monthlyRate, durationMonths) - 1);

// For each month:
// interestPayment = remainingBalance * monthlyRate;
// principalPayment = monthlyPayment - interestPayment;
// remainingBalance = remainingBalance - principalPayment;
```

**API Routes**:
- Standard CRUD: `/api/loans`
- `GET /api/loans/:id/schedule` - Get amortization schedule
- `POST /api/loans/:id/generate-schedule` - Generate/regenerate schedule

---

### 4. Variables (Variables de coût, taxes, inflation)

**Purpose**: Track variable costs, taxes, inflation rates, exchange rates

**Model**:
```typescript
interface Variable {
  id: number;
  name: string;
  type: VariableType; // cost, tax, inflation, exchange_rate, other
  value: number;
  unit?: string; // percentage, amount, etc.
  effectiveDate: string;
  endDate?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Relations**:
- None (standalone entity)

**Enums**:
- `VariableType`: cost, tax, inflation, exchange_rate, other

**API Routes**:
- Standard CRUD: `/api/variables`
- `GET /api/variables?type={type}` - Filter by type

---

### 5. Personnel (Salaires et charges)

**Purpose**: Track staff salaries and employer charges

**Model**:
```typescript
interface Personnel {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  position: string;
  type: PersonnelType; // full_time, part_time, contractor, intern
  baseSalary: number;
  employerCharges: number; // % or fixed amount
  employerChargesType: 'percentage' | 'fixed';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PersonnelProjection {
  month: string; // YYYY-MM
  totalSalary: number;
  totalCharges: number;
  totalCost: number;
  headcount: number;
}
```

**Relations**:
- None (standalone entity)

**Enums**:
- `PersonnelType`: full_time, part_time, contractor, intern

**Features**:
- Monthly projections (calculated in code)
- Total workforce cost calculation
- Employer charges calculation (percentage or fixed)

**Calculation Logic** (in code):
```typescript
// For each active personnel in a month:
const charges = employerChargesType === 'percentage' 
  ? baseSalary * (employerCharges / 100)
  : employerCharges;
const totalCost = baseSalary + charges;
```

**API Routes**:
- Standard CRUD: `/api/personnel`
- `GET /api/personnel/projections?start={YYYY-MM}&end={YYYY-MM}` - Get projections
- `GET /api/personnel/total-cost?month={YYYY-MM}` - Get total cost for month

---

### 6. Sales (CA - Chiffre d'affaires)

**Purpose**: Track revenue by type (on-site, delivery, takeaway, catering)

**Model**:
```typescript
interface Sale {
  id: number;
  date: string;
  type: SalesType; // on_site, delivery, takeaway, catering, other
  amount: number;
  quantity?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SalesSummary {
  month: string; // YYYY-MM
  onSite: number;
  delivery: number;
  takeaway: number;
  catering: number;
  other: number;
  total: number;
}
```

**Relations**:
- None (standalone entity)

**Enums**:
- `SalesType`: on_site, delivery, takeaway, catering, other

**Features**:
- Monthly summaries (calculated in code)
- Filter by type
- Filter by date range

**API Routes**:
- Standard CRUD: `/api/sales`
- `GET /api/sales/summary?start={YYYY-MM}&end={YYYY-MM}` - Get monthly summaries
- `GET /api/sales?month={YYYY-MM}` - Get sales for month
- `GET /api/sales?type={type}` - Filter by type

---

### 7. Investments (Investissements)

**Purpose**: Track investments with depreciation

**Model**:
```typescript
interface Investment {
  id: number;
  name: string;
  type: InvestmentType; // equipment, renovation, technology, vehicle, other
  amount: number;
  purchaseDate: string;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod; // straight_line, declining_balance, units_of_production
  residualValue: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface DepreciationEntry {
  id: number;
  investmentId: number;
  month: string; // YYYY-MM
  depreciationAmount: number;
  accumulatedDepreciation: number;
  bookValue: number;
}
```

**Relations**:
- `Investment` 1:N `DepreciationEntry` (one investment has many depreciation entries)

**Enums**:
- `InvestmentType`: equipment, renovation, technology, vehicle, other
- `DepreciationMethod`: straight_line, declining_balance, units_of_production

**Features**:
- Automatic depreciation calculation (in code)
- Links to cash flow & balance sheet
- Monthly depreciation entries

**Calculation Logic** (in code):
```typescript
// Straight-line depreciation
const depreciableAmount = amount - residualValue;
const monthlyDepreciation = depreciableAmount / usefulLifeMonths;

// For each month:
// depreciationAmount = monthlyDepreciation;
// accumulatedDepreciation += depreciationAmount;
// bookValue = amount - accumulatedDepreciation;
```

**API Routes**:
- Standard CRUD: `/api/investments`
- `GET /api/investments/:id/depreciation` - Get depreciation schedule
- `POST /api/investments/:id/generate-depreciation` - Generate depreciation

---

### 8. Cash Flow (Trésorerie)

**Purpose**: Track monthly cash inflows/outflows and bank balance

**Model**:
```typescript
interface CashFlowEntry {
  id: number;
  month: string; // YYYY-MM
  openingBalance: number;
  cashInflows: number;
  cashOutflows: number;
  netCashFlow: number; // calculated: inflows - outflows
  closingBalance: number; // calculated: openingBalance + netCashFlow
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Relations**:
- Aggregates data from: Sales (inflows), Expenses, Leasing, Personnel, Loans (outflows)

**Features**:
- Auto-calculate from other entities (in code)
- Bank balance projections
- Monthly cash flow tracking

**Calculation Logic** (in code):
```typescript
// For a given month:
const cashInflows = sum(sales for month);
const cashOutflows = sum(expenses) + sum(leasing) + sum(personnel) + sum(loan payments);
const netCashFlow = cashInflows - cashOutflows;
const closingBalance = openingBalance + netCashFlow;
```

**API Routes**:
- Standard CRUD: `/api/cash-flow`
- `GET /api/cash-flow?month={YYYY-MM}` - Get entry for month
- `GET /api/cash-flow/projection?start={YYYY-MM}&end={YYYY-MM}` - Get projections

---

### 9. Working Capital / BFR (Besoin en Fonds de Roulement)

**Purpose**: Track working capital needs

**Model**:
```typescript
interface WorkingCapital {
  id: number;
  month: string; // YYYY-MM
  accountsReceivable: number; // Créances clients
  inventory: number; // Stocks
  accountsPayable: number; // Dettes fournisseurs
  otherCurrentAssets: number;
  otherCurrentLiabilities: number;
  workingCapitalNeed: number; // BFR - calculated
  createdAt: string;
  updatedAt: string;
}
```

**Relations**:
- None (standalone, but can reference Sales for receivables)

**Features**:
- Auto-calculate BFR (in code)
- Monthly tracking

**Calculation Logic** (in code):
```typescript
const currentAssets = accountsReceivable + inventory + otherCurrentAssets;
const currentLiabilities = accountsPayable + otherCurrentLiabilities;
const workingCapitalNeed = currentAssets - currentLiabilities;
```

**API Routes**:
- Standard CRUD: `/api/working-capital`
- `GET /api/working-capital?month={YYYY-MM}` - Get for month
- `POST /api/working-capital/calculate?month={YYYY-MM}` - Auto-calculate from other data

---

### 10. Profit and Loss / CR (Compte de Résultat)

**Purpose**: Auto-computed profit and loss statement

**Model**:
```typescript
interface ProfitAndLoss {
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
  // Calculated
  grossProfit: number; // totalRevenue - costOfGoodsSold
  operatingProfit: number; // grossProfit - operatingExpenses - personnelCosts - leasingCosts - depreciation
  netProfit: number; // operatingProfit - interestExpense - taxes - otherExpenses
  createdAt: string;
  updatedAt: string;
}
```

**Relations**:
- Aggregates: Sales (revenue), Expenses, Personnel, Leasing, Investments (depreciation), Loans (interest)

**Features**:
- **Auto-computed from other entities** (in code)
- Monthly P&L statements
- All calculations done in API route, not database

**Calculation Logic** (in code):
```typescript
// For a given month:
const totalRevenue = sum(sales for month);
const costOfGoodsSold = sum(expenses where category = 'supplies');
const operatingExpenses = sum(expenses where category != 'supplies');
const personnelCosts = sum(personnel total costs for month);
const leasingCosts = sum(leasing payments for month);
const depreciation = sum(depreciation entries for month);
const interestExpense = sum(loan interest payments for month);
const taxes = calculate from variables (tax rate);
const otherExpenses = sum(other expenses);

const grossProfit = totalRevenue - costOfGoodsSold;
const operatingProfit = grossProfit - operatingExpenses - personnelCosts - leasingCosts - depreciation;
const netProfit = operatingProfit - interestExpense - taxes - otherExpenses;
```

**API Routes**:
- Standard CRUD: `/api/profit-loss`
- `GET /api/profit-loss?month={YYYY-MM}` - Get for month
- `POST /api/profit-loss/calculate?month={YYYY-MM}` - Auto-calculate from all data

---

### 11. Balance Sheet / Bilan

**Purpose**: Auto-computed balance sheet

**Model**:
```typescript
interface BalanceSheet {
  id: number;
  month: string; // YYYY-MM
  // Assets
  currentAssets: number;
  fixedAssets: number;
  intangibleAssets: number;
  totalAssets: number; // calculated
  // Liabilities
  currentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number; // calculated
  // Equity
  shareCapital: number;
  retainedEarnings: number;
  totalEquity: number; // calculated
  // Auto-validated: totalAssets = totalLiabilities + totalEquity
  createdAt: string;
  updatedAt: string;
}
```

**Relations**:
- Aggregates: Working Capital (current assets/liabilities), Investments (fixed assets), Loans (long-term debt), Profit & Loss (retained earnings)

**Features**:
- **Auto-computed from other entities** (in code)
- Balance validation (assets = liabilities + equity)
- Monthly balance sheets

**Calculation Logic** (in code):
```typescript
// For a given month:
const currentAssets = workingCapital.currentAssets;
const fixedAssets = sum(investments bookValue);
const intangibleAssets = manual entry or 0;

const currentLiabilities = workingCapital.currentLiabilities;
const longTermDebt = sum(loans remaining balance);
const shareCapital = manual entry;
const retainedEarnings = previous retainedEarnings + netProfit from P&L;

const totalAssets = currentAssets + fixedAssets + intangibleAssets;
const totalLiabilities = currentLiabilities + longTermDebt;
const totalEquity = shareCapital + retainedEarnings;

// Validation: totalAssets must equal totalLiabilities + totalEquity
```

**API Routes**:
- Standard CRUD: `/api/balance-sheet`
- `GET /api/balance-sheet?month={YYYY-MM}` - Get for month
- `POST /api/balance-sheet/calculate?month={YYYY-MM}` - Auto-calculate from all data

---

### 12. Financial Plan (Plan de Financement)

**Purpose**: Track sources and uses of funds

**Model**:
```typescript
interface FinancialPlan {
  id: number;
  month: string; // YYYY-MM
  // Sources of funds
  equity: number;
  loans: number;
  otherSources: number;
  totalSources: number; // calculated
  // Uses of funds
  investments: number;
  workingCapital: number;
  loanRepayments: number;
  otherUses: number;
  totalUses: number; // calculated
  // Balance
  netFinancing: number; // calculated: totalSources - totalUses
  createdAt: string;
  updatedAt: string;
}
```

**Relations**:
- Aggregates: Loans (sources and repayments), Investments (uses), Working Capital (uses)

**Features**:
- Auto-calculate from other entities (in code)
- Monthly financial plans
- Net financing calculation

**Calculation Logic** (in code):
```typescript
// For a given month:
const equity = manual entry or previous equity;
const loans = sum(new loans for month);
const investments = sum(investments for month);
const workingCapital = workingCapitalNeed;
const loanRepayments = sum(loan payments for month);

const totalSources = equity + loans + otherSources;
const totalUses = investments + workingCapital + loanRepayments + otherUses;
const netFinancing = totalSources - totalUses;
```

**API Routes**:
- Standard CRUD: `/api/financial-plan`
- `GET /api/financial-plan?month={YYYY-MM}` - Get for month
- `POST /api/financial-plan/calculate?month={YYYY-MM}` - Auto-calculate

---

## Database Schema (Supabase)

### Supabase Tables

All tables use snake_case naming convention. Use Supabase for storage only, calculations in code.

**Tables to create in Supabase:**

1. `expenses`
2. `leasing_payments`
3. `loans`
4. `loan_schedules`
5. `variables`
6. `personnel`
7. `sales`
8. `investments`
9. `depreciation_entries`
10. `cash_flow`
11. `working_capital`
12. `profit_and_loss`
13. `balance_sheet`
14. `financial_plan`

**SQL Schema Example** (for reference, create in Supabase dashboard):

```sql
-- Expenses
CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  recurrence VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  vendor VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Loans
CREATE TABLE loans (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  loan_number VARCHAR(50) NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  lender VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Loan Schedules
CREATE TABLE loan_schedules (
  id BIGSERIAL PRIMARY KEY,
  loan_id BIGINT REFERENCES loans(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  principal_payment DECIMAL(15,2) NOT NULL,
  interest_payment DECIMAL(15,2) NOT NULL,
  total_payment DECIMAL(15,2) NOT NULL,
  remaining_balance DECIMAL(15,2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  UNIQUE(loan_id, month)
);

-- Similar structure for all other tables...
```

**Important**: 
- Use Supabase dashboard or migrations to create tables
- Enable Row Level Security (RLS) policies
- Add indexes on frequently queried fields (month, date, category, etc.)

---

## API Routes Implementation

### Supabase Integration Pattern

**MUST FOLLOW THIS PATTERN:**

```typescript
// apps/web/src/app/api/[entity]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Expense, CreateExpenseData } from '@kit/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform snake_case to camelCase
    const expenses: Expense[] = data.map(transformExpense);
    
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateExpenseData = await request.json();
    
    // Validation with Zod
    // Business logic here
    
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('expenses')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformExpense(data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

// Helper functions for transformation
function transformExpense(row: any): Expense {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    recurrence: row.recurrence,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    vendor: row.vendor,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateExpenseData): any {
  return {
    name: data.name,
    category: data.category,
    amount: data.amount,
    recurrence: data.recurrence,
    start_date: data.startDate,
    end_date: data.endDate,
    description: data.description,
    vendor: data.vendor,
    is_active: data.isActive ?? true,
  };
}
```

### Calculation Endpoints

For entities that auto-calculate (Cash Flow, P&L, Balance Sheet, BFR, Financial Plan):

```typescript
// apps/web/src/app/api/profit-loss/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { ProfitAndLoss } from '@kit/types';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    if (!month) {
      return NextResponse.json({ error: 'Month parameter required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    
    // Fetch all related data
    const [sales, expenses, personnel, leasing, investments, loans, variables] = await Promise.all([
      getSalesForMonth(supabase, month),
      getExpensesForMonth(supabase, month),
      getPersonnelForMonth(supabase, month),
      getLeasingForMonth(supabase, month),
      getDepreciationForMonth(supabase, month),
      getLoanInterestForMonth(supabase, month),
      getTaxRate(supabase, month),
    ]);

    // Calculate in code (NOT in database)
    const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
    const costOfGoodsSold = expenses
      .filter(e => e.category === 'supplies')
      .reduce((sum, e) => sum + e.amount, 0);
    const operatingExpenses = expenses
      .filter(e => e.category !== 'supplies')
      .reduce((sum, e) => sum + e.amount, 0);
    const personnelCosts = personnel.reduce((sum, p) => {
      const charges = p.employerChargesType === 'percentage'
        ? p.baseSalary * (p.employerCharges / 100)
        : p.employerCharges;
      return sum + p.baseSalary + charges;
    }, 0);
    const leasingCosts = leasing.reduce((sum, l) => sum + l.amount, 0);
    const depreciation = investments.reduce((sum, d) => sum + d.depreciationAmount, 0);
    const interestExpense = loans.reduce((sum, l) => sum + l.interestPayment, 0);
    const taxes = totalRevenue * (variables.taxRate / 100);
    const otherExpenses = 0; // Add logic as needed

    const grossProfit = totalRevenue - costOfGoodsSold;
    const operatingProfit = grossProfit - operatingExpenses - personnelCosts - leasingCosts - depreciation;
    const netProfit = operatingProfit - interestExpense - taxes - otherExpenses;

    const profitAndLoss: ProfitAndLoss = {
      id: 0, // Will be set after insert
      month,
      totalRevenue,
      costOfGoodsSold,
      operatingExpenses,
      personnelCosts,
      leasingCosts,
      depreciation,
      interestExpense,
      taxes,
      otherExpenses,
      grossProfit,
      operatingProfit,
      netProfit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    const { data: saved, error } = await supabase
      .from('profit_and_loss')
      .upsert(transformToSnakeCase(profitAndLoss), {
        onConflict: 'month',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformProfitAndLoss(saved));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate profit and loss' }, { status: 500 });
  }
}
```

---

## Pages to Implement

### 🔐 Authentication Pages

**Already implemented** - Use existing auth system:
- `/auth/login`
- `/auth/register`

### 🏠 Dashboard

**Route**: `/dashboard`

**Features**:
- Summary of all financial KPIs
- Charts:
  - Revenue chart (CA over time)
  - Expenses chart
  - Profit chart
  - Cash flow chart
  - Loans chart
- Key metrics cards:
  - Total Revenue
  - Total Expenses
  - Net Profit
  - Cash Balance
  - Working Capital
  - Total Debt
  - Personnel Cost
  - Headcount

**Implementation**:
```typescript
// apps/web/src/app/dashboard/page.tsx
"use client";

import { useFinancialKPIs, useRevenueChart, useExpensesChart } from '@kit/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import AppLayout from '@/components/app-layout';

export default function DashboardPage() {
  const { data: kpis } = useFinancialKPIs('2025-01');
  const { data: revenueData } = useRevenueChart('2025-01', '2025-12');
  // ... other charts

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1>Financial Dashboard</h1>
        
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader>
            <CardContent>{kpis?.totalRevenue}</CardContent>
          </Card>
          {/* More cards */}
        </div>

        {/* Charts */}
        <Card>
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
            </LineChart>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
```

### 💰 Expenses / Charges d'exploitation

**Routes**:
- `/expenses` - List page
- `/expenses/create` - Create page
- `/expenses/[id]` - Detail page
- `/expenses/[id]/edit` - Edit page

**Features**:
- CRUD operations
- Category filtering
- Monthly recurring rules
- Auto-sum by category (display calculated totals)
- **Annual Budgeting** - Project all expenses for the full year based on recurrence patterns
- Annual budget view with monthly breakdown
- Projection summary with totals and averages by category

### 👥 Personnel

**Routes**:
- `/personnel` - List page
- `/personnel/create` - Create page
- `/personnel/[id]` - Detail page
- `/personnel/[id]/edit` - Edit page

**Features**:
- CRUD operations
- Salary and charges management
- Monthly projections page
- Total workforce cost display

### 📦 Investments

**Routes**:
- `/investments` - List page
- `/investments/create` - Create page
- `/investments/[id]` - Detail page
- `/investments/[id]/edit` - Edit page
- `/investments/[id]/depreciation` - Depreciation schedule view

**Features**:
- CRUD operations
- Depreciation logic (calculated in code)
- Links to cash flow & balance sheet
- Depreciation schedule visualization

### 📉 Cash Flow

**Routes**:
- `/cash-flow` - List page
- `/cash-flow/create` - Create page
- `/cash-flow/[id]` - Detail page
- `/cash-flow/[id]/edit` - Edit page

**Features**:
- Monthly cash flow entries
- Bank balance projections
- Auto-calculate from other entities
- Chart visualization

### 🧮 Loans (Emprunts)

**Routes**:
- `/loans` - List page (shows all loans: Emprunt 1, 2, 3, etc.)
- `/loans/create` - Create page
- `/loans/[id]` - Detail page
- `/loans/[id]/edit` - Edit page
- `/loans/[id]/schedule` - Amortization schedule view

**Features**:
- Separate modules for each loan (Emprunt 1, 2, 3)
- Automatic repayment table generation
- Monthly amortization schedule
- Payment tracking
- Interest calculation

### 📜 Financial Statements

#### Profit and Loss (CR)

**Routes**:
- `/profit-loss` - List page (monthly P&L statements)
- `/profit-loss/[month]` - Detail view for specific month
- `/profit-loss/calculate` - Trigger calculation

**Features**:
- Auto-computed from all financial data
- Monthly statements
- Year-to-date summaries
- Export to PDF/Excel

#### Balance Sheet (Bilan)

**Routes**:
- `/balance-sheet` - List page (monthly balance sheets)
- `/balance-sheet/[month]` - Detail view
- `/balance-sheet/calculate` - Trigger calculation

**Features**:
- Auto-computed from all financial data
- Balance validation (assets = liabilities + equity)
- Monthly statements
- Export functionality

#### Working Capital (BFR)

**Routes**:
- `/working-capital` - List page
- `/working-capital/create` - Create page
- `/working-capital/[id]` - Detail page
- `/working-capital/calculate` - Auto-calculate

**Features**:
- Monthly BFR tracking
- Auto-calculation option
- Trend visualization

#### Financial Plan (Plan de Financement)

**Routes**:
- `/financial-plan` - List page
- `/financial-plan/create` - Create page
- `/financial-plan/[id]` - Detail page
- `/financial-plan/calculate` - Auto-calculate

**Features**:
- Monthly financial plans
- Sources and uses tracking
- Net financing calculation

---

## Navigation Structure

Update `packages/config/src/paths.config.ts`:

```typescript
export const pathsConfig: NavigationConfig = {
  navMain: [
    {
      title: "dashboard",
      url: "/dashboard",
      icon: "Home",
      translationKey: "dashboard"
    },
    {
      title: "Revenue",
      url: "#",
      icon: "TrendingUp",
      items: [
        {
          title: "Sales",
          url: "/sales",
          icon: "DollarSign"
        }
      ]
    },
    {
      title: "Expenses",
      url: "#",
      icon: "TrendingDown",
      items: [
        {
          title: "Expenses",
          url: "/expenses",
          icon: "Receipt"
        },
        {
          title: "Leasing",
          url: "/leasing",
          icon: "Building"
        },
        {
          title: "Personnel",
          url: "/personnel",
          icon: "Users"
        }
      ]
    },
    {
      title: "Financing",
      url: "#",
      icon: "CreditCard",
      items: [
        {
          title: "Loans",
          url: "/loans",
          icon: "Banknote"
        },
        {
          title: "Investments",
          url: "/investments",
          icon: "Briefcase"
        }
      ]
    },
    {
      title: "Financial Statements",
      url: "#",
      icon: "FileText",
      items: [
        {
          title: "Profit & Loss",
          url: "/profit-loss",
          icon: "TrendingUp"
        },
        {
          title: "Balance Sheet",
          url: "/balance-sheet",
          icon: "FileSpreadsheet"
        },
        {
          title: "Cash Flow",
          url: "/cash-flow",
          icon: "ArrowUpDown"
        },
        {
          title: "Working Capital",
          url: "/working-capital",
          icon: "Wallet"
        },
        {
          title: "Financial Plan",
          url: "/financial-plan",
          icon: "Target"
        }
      ]
    },
    {
      title: "Settings",
      url: "#",
      icon: "Settings",
      items: [
        {
          title: "Variables",
          url: "/variables",
          icon: "Sliders"
        },
        {
          title: "Users",
          url: "/users",
          icon: "Users"
        }
      ]
    }
  ],
  navSecondary: []
};
```

---

## Calculation Services

Create calculation services in `apps/web/src/lib/calculations/`:

### Loan Calculation Service

```typescript
// apps/web/src/lib/calculations/loans.ts
import type { Loan, LoanScheduleEntry } from '@kit/types';

export function calculateLoanSchedule(loan: Loan): LoanScheduleEntry[] {
  const monthlyRate = loan.interestRate / 12 / 100;
  const monthlyPayment = loan.principalAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, loan.durationMonths)) / 
    (Math.pow(1 + monthlyRate, loan.durationMonths) - 1);

  const schedule: LoanScheduleEntry[] = [];
  let remainingBalance = loan.principalAmount;
  const startDate = new Date(loan.startDate);

  for (let month = 1; month <= loan.durationMonths; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + month - 1);

    schedule.push({
      id: 0, // Will be set by database
      loanId: loan.id,
      month,
      paymentDate: paymentDate.toISOString().split('T')[0],
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      totalPayment: Math.round(monthlyPayment * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
      isPaid: false,
    });
  }

  return schedule;
}
```

### Expense Projection Calculation Service

**CRITICAL**: All expenses must be projected for annual budgeting. This service calculates how expenses will occur throughout the year based on their recurrence patterns.

```typescript
// apps/web/src/lib/calculations/expense-projections.ts
import type { Expense, ExpenseProjection, ExpenseRecurrence, ExpenseCategory } from '@kit/types';

/**
 * Project a single expense across a date range based on its recurrence pattern
 */
export function projectExpense(
  expense: Expense,
  startMonth: string, // YYYY-MM
  endMonth: string // YYYY-MM
): ExpenseProjection[] {
  const projections: ExpenseProjection[] = [];
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');
  const expenseStart = new Date(expense.startDate);
  const expenseEnd = expense.endDate ? new Date(expense.endDate) : null;

  // Only project active expenses
  if (!expense.isActive) {
    return projections;
  }

  // Handle one-time expenses
  if (expense.recurrence === ExpenseRecurrence.ONE_TIME) {
    const expenseMonth = expenseStart.toISOString().slice(0, 7); // YYYY-MM
    if (expenseMonth >= startMonth && expenseMonth <= endMonth) {
      // Check if expense date is within range
      if (expenseStart >= start && expenseStart <= end) {
        // Check if expense hasn't ended yet
        if (!expenseEnd || expenseStart <= expenseEnd) {
          projections.push({
            month: expenseMonth,
            expenseId: expense.id,
            expenseName: expense.name,
            category: expense.category,
            amount: expense.amount,
            isProjected: expenseStart > new Date(), // Projected if in the future
          });
        }
      }
    }
    return projections;
  }

  // Handle recurring expenses
  let currentDate = new Date(Math.max(start.getTime(), expenseStart.getTime()));
  const finalDate = expenseEnd ? new Date(Math.min(end.getTime(), expenseEnd.getTime())) : end;

  while (currentDate <= finalDate) {
    const month = currentDate.toISOString().slice(0, 7); // YYYY-MM

    let shouldInclude = false;
    let amount = expense.amount;

    switch (expense.recurrence) {
      case ExpenseRecurrence.MONTHLY:
        // Include every month
        shouldInclude = true;
        break;

      case ExpenseRecurrence.QUARTERLY:
        // Include every 3 months (Jan, Apr, Jul, Oct)
        const monthNum = currentDate.getMonth();
        shouldInclude = monthNum % 3 === expenseStart.getMonth() % 3;
        break;

      case ExpenseRecurrence.YEARLY:
        // Include same month every year
        shouldInclude = currentDate.getMonth() === expenseStart.getMonth();
        break;

      case ExpenseRecurrence.CUSTOM:
        // For custom, you might need additional logic or a customDays field
        // For now, treat as monthly
        shouldInclude = true;
        break;
    }

    if (shouldInclude) {
      projections.push({
        month,
        expenseId: expense.id,
        expenseName: expense.name,
        category: expense.category,
        amount,
        isProjected: currentDate > new Date(), // Projected if in the future
      });
    }

    // Move to next month
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return projections;
}

/**
 * Project all expenses for a given year
 */
export function projectExpensesForYear(
  expenses: Expense[],
  year: string // YYYY
): ExpenseProjection[] {
  const startMonth = `${year}-01`;
  const endMonth = `${year}-12`;
  const allProjections: ExpenseProjection[] = [];

  for (const expense of expenses) {
    const projections = projectExpense(expense, startMonth, endMonth);
    allProjections.push(...projections);
  }

  return allProjections.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate annual budget summary
 */
export function calculateAnnualBudgetSummary(
  projections: ExpenseProjection[],
  year: string
): {
  totalAnnual: number;
  monthlyAverage: number;
  byCategory: Record<ExpenseCategory, {
    total: number;
    monthlyAverage: number;
    count: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    total: number;
    byCategory: Record<ExpenseCategory, number>;
  }>;
} {
  // Initialize category totals
  const categoryTotals: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const monthlyTotals: Record<string, number> = {};
  const monthlyByCategory: Record<string, Record<string, number>> = {};

  // Initialize all categories
  Object.values(ExpenseCategory).forEach(cat => {
    categoryTotals[cat] = 0;
    categoryCounts[cat] = 0;
  });

  // Process projections
  for (const projection of projections) {
    // Category totals
    categoryTotals[projection.category] = (categoryTotals[projection.category] || 0) + projection.amount;
    categoryCounts[projection.category] = (categoryCounts[projection.category] || 0) + 1;

    // Monthly totals
    monthlyTotals[projection.month] = (monthlyTotals[projection.month] || 0) + projection.amount;

    // Monthly by category
    if (!monthlyByCategory[projection.month]) {
      monthlyByCategory[projection.month] = {};
      Object.values(ExpenseCategory).forEach(cat => {
        monthlyByCategory[projection.month][cat] = 0;
      });
    }
    monthlyByCategory[projection.month][projection.category] += projection.amount;
  }

  // Calculate totals
  const totalAnnual = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const monthlyAverage = totalAnnual / 12;

  // Build category summary
  const byCategory: Record<ExpenseCategory, {
    total: number;
    monthlyAverage: number;
    count: number;
  }> = {} as any;

  Object.values(ExpenseCategory).forEach(cat => {
    byCategory[cat] = {
      total: categoryTotals[cat] || 0,
      monthlyAverage: (categoryTotals[cat] || 0) / 12,
      count: categoryCounts[cat] || 0,
    };
  });

  // Build monthly breakdown
  const monthlyBreakdown = Object.keys(monthlyTotals)
    .sort()
    .map(month => ({
      month,
      total: monthlyTotals[month],
      byCategory: monthlyByCategory[month] || {},
    }));

  return {
    totalAnnual,
    monthlyAverage,
    byCategory,
    monthlyBreakdown,
  };
}

/**
 * Get monthly budget for a specific month
 */
export function getMonthlyBudget(
  projections: ExpenseProjection[],
  month: string // YYYY-MM
): {
  month: string;
  total: number;
  byCategory: Record<ExpenseCategory, number>;
  expenses: ExpenseProjection[];
} {
  const monthProjections = projections.filter(p => p.month === month);
  
  const byCategory: Record<string, number> = {};
  Object.values(ExpenseCategory).forEach(cat => {
    byCategory[cat] = 0;
  });

  let total = 0;
  for (const projection of monthProjections) {
    byCategory[projection.category] = (byCategory[projection.category] || 0) + projection.amount;
    total += projection.amount;
  }

  return {
    month,
    total,
    byCategory: byCategory as Record<ExpenseCategory, number>,
    expenses: monthProjections,
  };
}
```

### Depreciation Calculation Service

```typescript
// apps/web/src/lib/calculations/depreciation.ts
import type { Investment, DepreciationEntry } from '@kit/types';

export function calculateDepreciation(
  investment: Investment,
  startMonth: string
): DepreciationEntry[] {
  const entries: DepreciationEntry[] = [];
  const depreciableAmount = investment.amount - investment.residualValue;
  let accumulatedDepreciation = 0;

  if (investment.depreciationMethod === 'straight_line') {
    const monthlyDepreciation = depreciableAmount / investment.usefulLifeMonths;
    
    for (let i = 0; i < investment.usefulLifeMonths; i++) {
      const monthDate = new Date(startMonth);
      monthDate.setMonth(monthDate.getMonth() + i);
      const month = monthDate.toISOString().slice(0, 7); // YYYY-MM

      accumulatedDepreciation += monthlyDepreciation;
      const bookValue = investment.amount - accumulatedDepreciation;

      entries.push({
        id: 0,
        investmentId: investment.id,
        month,
        depreciationAmount: Math.round(monthlyDepreciation * 100) / 100,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100,
      });
    }
  }
  // Add other depreciation methods...

  return entries;
}
```

### Financial Statement Calculation Services

```typescript
// apps/web/src/lib/calculations/financial-statements.ts
import type { 
  ProfitAndLoss, 
  BalanceSheet, 
  WorkingCapital,
  FinancialPlan,
  Expense,
  Sale,
  Personnel,
  LeasingPayment,
  LoanScheduleEntry,
  DepreciationEntry
} from '@kit/types';

export async function calculateProfitAndLoss(
  month: string,
  sales: Sale[],
  expenses: Expense[],
  personnel: Personnel[],
  leasing: LeasingPayment[],
  depreciation: DepreciationEntry[],
  loanInterest: LoanScheduleEntry[],
  taxRate: number
): Promise<ProfitAndLoss> {
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
  const costOfGoodsSold = expenses
    .filter(e => e.category === 'supplies')
    .reduce((sum, e) => sum + e.amount, 0);
  const operatingExpenses = expenses
    .filter(e => e.category !== 'supplies')
    .reduce((sum, e) => sum + e.amount, 0);
  const personnelCosts = personnel.reduce((sum, p) => {
    const charges = p.employerChargesType === 'percentage'
      ? p.baseSalary * (p.employerCharges / 100)
      : p.employerCharges;
    return sum + p.baseSalary + charges;
  }, 0);
  const leasingCosts = leasing.reduce((sum, l) => sum + l.amount, 0);
  const depreciationAmount = depreciation.reduce((sum, d) => sum + d.depreciationAmount, 0);
  const interestExpense = loanInterest.reduce((sum, l) => sum + l.interestPayment, 0);
  const taxes = totalRevenue * (taxRate / 100);
  const otherExpenses = 0;

  const grossProfit = totalRevenue - costOfGoodsSold;
  const operatingProfit = grossProfit - operatingExpenses - personnelCosts - leasingCosts - depreciationAmount;
  const netProfit = operatingProfit - interestExpense - taxes - otherExpenses;

  return {
    id: 0,
    month,
    totalRevenue,
    costOfGoodsSold,
    operatingExpenses,
    personnelCosts,
    leasingCosts,
    depreciation: depreciationAmount,
    interestExpense,
    taxes,
    otherExpenses,
    grossProfit,
    operatingProfit,
    netProfit,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Similar functions for BalanceSheet, WorkingCapital, FinancialPlan...
```

---

## Environment Variables

Add to `apps/web/env.example`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Implementation Checklist

### Phase 1: Core Models & API
- [ ] Create all TypeScript types in `packages/types/src/financial.ts` ✅
- [ ] Create Supabase client in `packages/lib/src/supabase.ts` ✅
- [ ] Create API clients for all entities ✅
- [ ] Create Supabase tables (via dashboard or migrations)
- [ ] Create API routes for all entities
- [ ] Create calculation services

### Phase 2: Hooks & State Management
- [ ] Create React Query hooks for all entities
- [ ] Create hooks for dashboard KPIs
- [ ] Create hooks for charts

### Phase 3: Pages
- [ ] Dashboard page with KPIs and charts
- [ ] Expenses CRUD pages
- [ ] **Expenses Annual Budget page** - Show projected expenses for the year with monthly breakdown
- [ ] Leasing CRUD pages
- [ ] Loans CRUD pages + schedule view
- [ ] Variables CRUD pages
- [ ] Personnel CRUD pages + projections
- [ ] Sales CRUD pages
- [ ] Investments CRUD pages + depreciation view
- [ ] Cash Flow CRUD pages
- [ ] Working Capital CRUD pages
- [ ] Profit & Loss pages
- [ ] Balance Sheet pages
- [ ] Financial Plan pages

### Phase 4: Calculations & Automation
- [ ] **Expense projection for annual budgeting** (CRITICAL)
- [ ] Loan schedule generation
- [ ] Depreciation calculation
- [ ] Cash flow auto-calculation
- [ ] P&L auto-calculation
- [ ] Balance sheet auto-calculation
- [ ] BFR auto-calculation
- [ ] Financial plan auto-calculation

### Phase 5: Dashboard & Visualizations
- [ ] KPI cards
- [ ] Revenue chart
- [ ] Expenses chart
- [ ] Profit chart
- [ ] Cash flow chart
- [ ] Loans chart

---

**Last Updated**: 2025-01-XX
**Version**: 2.0.0 - Financial Tracking Application

