# SmartLogBook - Development Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Git
- Visual Studio Code (recommended)
- Git (for version control)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd smartlogbook-console

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Development Server
- **Frontend**: http://localhost:3000
- **API Routes**: http://localhost:3000/api/*
- **MSW Mocking**: Active in development mode
- **Hot Reload**: Automatic page refresh on changes
- **TypeScript**: Real-time type checking
- **File Upload**: Complete file upload system with Azure Blob Storage integration
- **Advanced Filtering**: Sophisticated filtering system with localStorage persistence

## 🏗️ Development Workflow

### 1. Understanding the Architecture

**Hybrid API Pattern**:
- **Development**: MSW intercepts API calls → Returns mock data
- **Production**: API routes process requests → Real backend integration

**File Structure**:
```
src/
├── app/                    # Next.js pages and API routes (100+ pages)
│   ├── api/               # API routes (80+ endpoints)
│   ├── auth/              # Authentication pages
│   ├── objects/           # Objects management with CRUD
│   ├── action-types/      # Action types management
│   ├── action-ref-types/  # Action reference types
│   ├── action-references/ # Action references management
│   ├── actions/           # Actions management
│   ├── acts/              # Acts management
│   ├── locations/         # Locations management
│   ├── location-levels/   # Location levels management
│   ├── events/            # Events management
│   ├── operation-types/   # Operation types management
│   ├── operations/        # Operations management
│   ├── checklists/        # Checklists management
│   ├── locomotive-models/ # Locomotive models management
│   ├── locomotives/       # Locomotives management
│   ├── users/             # Users management
│   ├── anomalies/         # Anomalies management
│   ├── issues/            # Issues management
│   ├── asset-items/       # Asset items management
│   ├── asset-models/      # Asset models management
│   ├── procedures/        # Procedures management
│   ├── questions/         # Questions management
│   ├── responses/         # Responses management
│   └── enums/             # Enums management
├── components/             # Reusable UI components (50+ components)
│   ├── ui/                # shadcn/ui components
│   ├── data-table.tsx     # Advanced data table component
│   ├── advanced-filter.tsx # Advanced filtering component
│   ├── file-upload.tsx    # File upload component
│   └── msw-provider.tsx   # MSW initialization
├── hooks/                  # Custom React hooks (25+ hooks)
├── lib/                    # Utilities and API clients
│   ├── api/               # API client functions (25+ clients)
│   ├── localStorage.ts    # Local storage utilities
│   └── utils.ts           # General utilities
├── mocks/                  # MSW mocking setup
└── shared/                 # Shared types and schemas
```

### 2. Adding New Entities

#### Step 1: Create Mock Data
```typescript
// src/mocks/data.ts
export const mockNewEntity = [
  {
    id: 1,
    name: "Example Entity",
    description: "Description here",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];
```

#### Step 2: Create API Client
```typescript
// src/lib/api/new-entity.ts
import { apiRequest } from './api';

export const newEntityApi = {
  getAll: () => apiRequest<NewEntity[]>('GET', '/api/newentity'),
  getById: (id: string) => apiRequest<NewEntity>('GET', `/api/newentity/${id}`),
  create: (data: CreateNewEntityData) => apiRequest<NewEntity>('POST', '/api/newentity', data),
  update: (id: string, data: UpdateNewEntityData) => apiRequest<NewEntity>('PUT', `/api/newentity/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/newentity/${id}`)
};
```

#### Step 3: Create React Hook
```typescript
// src/hooks/useNewEntity.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newEntityApi } from '@/lib/api/new-entity';

export function useNewEntity() {
  return useQuery({
    queryKey: ['newentity'],
    queryFn: newEntityApi.getAll
  });
}

export function useCreateNewEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: newEntityApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newentity'] });
    }
  });
}
```

#### Step 4: Create API Routes
```typescript
// src/app/api/newentity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mockNewEntity } from '@/mocks/data';

export async function GET(request: NextRequest) {
  return NextResponse.json(mockNewEntity);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const newEntity = {
    id: mockNewEntity.length + 1,
    ...body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  mockNewEntity.push(newEntity);
  return NextResponse.json(newEntity, { status: 201 });
}
```

```typescript
// src/app/api/newentity/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mockNewEntity } from '@/mocks/data';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = mockNewEntity.find(item => item.id === parseInt(id));
  
  if (!entity) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }
  
  return NextResponse.json(entity);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const index = mockNewEntity.findIndex(item => item.id === parseInt(id));
  
  if (index === -1) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }
  
  mockNewEntity[index] = { ...mockNewEntity[index], ...body, updated_at: new Date().toISOString() };
  return NextResponse.json(mockNewEntity[index]);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = mockNewEntity.findIndex(item => item.id === parseInt(id));
  
  if (index === -1) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }
  
  mockNewEntity.splice(index, 1);
  return NextResponse.json({}, { status: 204 });
}
```

#### Step 5: Create MSW Handlers
```typescript
// src/mocks/handlers/smartlogbook.ts
import { http, HttpResponse } from 'msw';
import { mockData } from '../data';

export const newEntityHandlers = createCrudHandlers('newentity', mockData.newEntity);
```

#### Step 6: Create Management Page
```typescript
// src/app/newentity/page.tsx
"use client";
import { useNewEntity } from '@/hooks/useNewEntity';
import { AppLayout } from '@/components/app-layout';
import { DataTable } from '@/components/data-table';

export default function NewEntityPage() {
  const { data: entities, isLoading, error } = useNewEntity();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading entities</div>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">New Entity Management</h1>
          <Button>Add New Entity</Button>
        </div>
        
        <DataTable
          data={entities || []}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description' }
          ]}
        />
      </div>
    </AppLayout>
  );
}
```

### 3. Creating Forms

#### Using React Hook Form + Zod
```typescript
// src/app/newentity/create/page.tsx
"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateNewEntity } from '@/hooks/useNewEntity';

const createEntitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required')
});

type CreateEntityData = z.infer<typeof createEntitySchema>;

export default function CreateNewEntityPage() {
  const createMutation = useCreateNewEntity();
  
  const form = useForm<CreateEntityData>({
    resolver: zodResolver(createEntitySchema)
  });

  const onSubmit = (data: CreateEntityData) => {
    createMutation.mutate(data);
  };

  return (
    <AppLayout>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            error={form.formState.errors.description?.message}
          />
        </div>
        
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating...' : 'Create Entity'}
        </Button>
      </form>
    </AppLayout>
  );
}
```

### 4. Adding Authentication

#### Protected Routes
```typescript
// src/components/protected-route.tsx
"use client";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  return <>{children}</>;
}
```

#### Role-based Access
```typescript
// src/components/role-guard.tsx
"use client";
import { useAuth } from '@/hooks/use-auth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || <div>Access denied</div>;
  }
  
  return <>{children}</>;
}
```

### 5. Working with MSW

#### Adding New Mock Handlers
```typescript
// src/mocks/handlers/smartlogbook.ts
export const newEntityHandlers = [
  http.get('/api/newentity', () => {
    return HttpResponse.json(mockData.newEntity);
  }),
  
  http.post('/api/newentity', async ({ request }) => {
    const body = await request.json();
    const newEntity = {
      id: mockData.newEntity.length + 1,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockData.newEntity.push(newEntity);
    return HttpResponse.json(newEntity, { status: 201 });
  })
];
```

#### Updating Mock Data
```typescript
// src/mocks/data.ts
export const mockData = {
  // ... existing data
  newEntity: mockNewEntity
};
```

### 6. Testing

#### Component Testing
```typescript
// src/components/__tests__/new-entity-form.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateNewEntityForm } from '../create-new-entity-form';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

test('creates new entity', async () => {
  const queryClient = createTestQueryClient();
  
  render(
    <QueryClientProvider client={queryClient}>
      <CreateNewEntityForm />
    </QueryClientProvider>
  );
  
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Entity' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test Description' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Entity' }));
  
  // Assertions...
});
```

#### API Testing
```typescript
// src/app/api/newentity/__tests__/route.test.ts
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

test('GET /api/newentity returns entities', async () => {
  const request = new NextRequest('http://localhost:3000/api/newentity');
  const response = await GET(request);
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(Array.isArray(data)).toBe(true);
});
```

### 7. Error Handling

#### API Error Handling
```typescript
// src/lib/api/api.ts
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}
```

#### Component Error Handling
```typescript
// src/hooks/useNewEntity.ts
export function useNewEntity() {
  return useQuery({
    queryKey: ['newentity'],
    queryFn: newEntityApi.getAll,
    retry: (failureCount, error) => {
      if (error.status === 404) return false;
      return failureCount < 3;
    }
  });
}
```

### 8. Performance Optimization

#### Code Splitting
```typescript
// Dynamic imports for large components
const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <div>Loading...</div>
});
```

#### React Query Optimization
```typescript
// Optimized query configuration
export function useNewEntity() {
  return useQuery({
    queryKey: ['newentity'],
    queryFn: newEntityApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
}
```

### 9. Deployment

#### Environment Configuration
```typescript
// src/lib/config.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  environment: process.env.NODE_ENV || 'development',
  mswEnabled: process.env.NODE_ENV === 'development'
};
```

#### Build Process
```bash
# Development build
pnpm build

# Production build
NODE_ENV=production pnpm build

# Start production server
pnpm start
```

### 10. Debugging

#### MSW Debugging
```typescript
// src/mocks/browser.ts
export const worker = setupWorker(...handlers);

if (process.env.NODE_ENV === 'development') {
  worker.start({
    onUnhandledRequest: 'warn',
    quiet: false
  });
}
```

#### React Query DevTools
```typescript
// src/app/providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## 🔧 Common Development Tasks

### Adding a New Field to an Entity
1. Update mock data structure
2. Update TypeScript types
3. Update API routes
4. Update MSW handlers
5. Update forms and components

### Adding a New Filter
1. Update API route to handle query parameters
2. Update MSW handler to filter data
3. Update frontend components
4. Add filter UI components

### Adding File Upload
1. Create file upload component
2. Update API route to handle FormData
3. Add file storage integration
4. Update MSW handler for file uploads

## 🐛 Troubleshooting

### Common Issues

#### MSW Not Working
- Check if MSW is enabled in development
- Verify handlers are properly registered
- Check browser console for MSW errors

#### API Routes Not Working
- Verify route file structure
- Check Next.js API route syntax
- Ensure proper TypeScript types

#### Build Errors
- Check TypeScript errors
- Verify all imports are correct
- Ensure all required files exist

#### Authentication Issues
- Check session management
- Verify token handling
- Ensure proper error handling

## 📚 Additional Resources

### External Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [MSW Documentation](https://mswjs.io/docs/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### SmartLogBook Documentation
- [Authentication System](./AUTHENTICATION_SYSTEM.md)
- [Objects Management](./OBJECTS_MANAGEMENT.md)
- [Action Types and References](./ACTION_TYPES_AND_REFERENCES.md)
- [Location Management](./LOCATION_MANAGEMENT.md)
- [Events Management](./EVENTS_MANAGEMENT.md)
- [Operation Types Management](./OPERATION_TYPES_MANAGEMENT.md)
- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [User Management](./USER_MANAGEMENT.md)
- [Locomotive Management](./LOCOMOTIVE_MANAGEMENT.md)
- [Anomaly Management](./ANOMALY_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)

## 🎯 Quick Reference

### Common Commands
```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript checks

# Database
pnpm db:generate      # Generate database migrations
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed database with test data

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
```

### File Structure Quick Reference
```
src/
├── app/                    # Next.js pages and API routes
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and API clients
├── mocks/                  # MSW mocking setup
└── shared/                 # Shared types and schemas
```

This development guide provides a comprehensive overview of how to work with the SmartLogBook application architecture and implement new features following the established patterns.
