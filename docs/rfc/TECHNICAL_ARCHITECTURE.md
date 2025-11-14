# SmartLogBook - Technical Architecture Documentation

## 🏗️ System Architecture Overview

SmartLogBook follows a modern **hybrid API architecture** that combines the benefits of both mock development and production-ready API routes.

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Pages     │  │ Components  │  │   Hooks     │             │
│  │             │  │             │  │             │             │
│  │ • Dashboard │  │ • UI Kit    │  │ • useAuth   │             │
│  │ • Objects   │  │ • Forms     │  │ • useObjects│             │
│  │ • Actions   │  │ • Tables    │  │ • useActions│             │
│  │ • Checklists│  │ • Layouts   │  │ • useEvents │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js API Routes)                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Auth APIs │  │ Entity APIs │  │ Business    │             │
│  │             │  │             │  │ Logic       │             │
│  │ • /login    │  │ • /objects  │  │ • Validation│             │
│  │ • /register │  │ • /actions  │  │ • Error     │             │
│  │ • /session  │  │ • /events   │  │   Handling  │             │
│  │ • /logout   │  │ • /checklists│ │ • Data      │             │
│  └─────────────┘  └─────────────┘  │   Transform │             │
│                                     └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Mock Layer (MSW) - Development Only            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Auth Mocks  │  │ Entity Mocks│  │ Data        │             │
│  │             │  │             │  │ Management  │             │
│  │ • Login     │  │ • CRUD Ops  │  │ • Mock Data │             │
│  │ • Register  │  │ • Filtering │  │ • Transform │             │
│  │ • Session   │  │ • Relations │  │ • Validation│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Future Backend Integration                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   .NET API  │  │ SQL Server  │  │ Azure AD    │             │
│  │             │  │ Database    │  │ B2C         │             │
│  │ • Controllers│  │ • Tables    │  │ • Auth      │             │
│  │ • Services  │  │ • Relations │  │ • Users     │             │
│  │ • DTOs      │  │ • Stored    │  │ • Roles     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Architecture

### Development Mode (MSW Active)
```
Frontend Request → MSW Interceptor → Mock Handler → Mock Data → Response
```

### Production Mode (MSW Disabled)
```
Frontend Request → API Route → Business Logic → Real Backend → Database → Response
```

## 📁 Project Structure

```
smartlogbook/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes (Business Logic Layer)
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── actiontypes/          # Action types CRUD
│   │   │   ├── actionreftypes/       # Action reference types CRUD
│   │   │   ├── actionreferences/     # Action references CRUD
│   │   │   ├── actions/              # Actions CRUD
│   │   │   ├── acts/                 # Acts CRUD
│   │   │   ├── objects/              # Objects CRUD
│   │   │   ├── localizations/        # Locations CRUD
│   │   │   ├── locationlevels/   # Location levels CRUD
│   │   │   ├── events/               # Events CRUD
│   │   │   ├── operationtypes/       # Operation types CRUD
│   │   │   ├── Operations/           # Operations CRUD
│   │   │   ├── checklists/           # Checklists CRUD
│   │   │   ├── locomotivemodels/     # Locomotive models CRUD
│   │   │   ├── locomotives/          # Locomotives CRUD
│   │   │   ├── users/                # Users CRUD
│   │   │   ├── anomalies/            # Anomalies CRUD
│   │   │   ├── issues/               # Issues CRUD
│   │   │   ├── assetitems/           # Asset items CRUD
│   │   │   ├── assetmodels/          # Asset models CRUD
│   │   │   ├── procedures/           # Procedures CRUD
│   │   │   ├── questions/            # Questions CRUD
│   │   │   ├── responses/            # Responses CRUD
│   │   │   ├── enums/                # Enums CRUD
│   │   │   └── upload/               # File upload endpoint
│   │   ├── auth/                     # Authentication pages
│   │   ├── dashboard/                # Main dashboard
│   │   ├── objects/                   # Objects management
│   │   ├── action-types/              # Action types management
│   │   ├── action-ref-types/          # Action reference types
│   │   ├── action-references/         # Action references management
│   │   ├── actions/                    # Actions management
│   │   ├── acts/                       # Acts management
│   │   ├── locations/                 # Locations management
│   │   ├── location-levels/           # Location levels management
│   │   ├── events/                    # Events management
│   │   ├── operation-types/           # Operation types management
│   │   ├── operations/                # Operations management
│   │   ├── checklists/                # Checklists management
│   │   ├── locomotive-models/         # Locomotive models
│   │   ├── locomotives/               # Locomotives management
│   │   ├── users/                     # Users management
│   │   ├── anomalies/                 # Anomalies management
│   │   ├── issues/                    # Issues management
│   │   ├── asset-items/               # Asset items management
│   │   ├── asset-models/              # Asset models management
│   │   ├── procedures/                # Procedures management
│   │   ├── questions/                 # Questions management
│   │   ├── responses/                 # Responses management
│   │   └── enums/                     # Enums management
│   ├── components/                    # Reusable UI components
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── app-layout.tsx             # Main app layout
│   │   ├── sidebar.tsx                # Navigation sidebar
│   │   ├── data-table.tsx             # Advanced data table component
│   │   ├── advanced-filter.tsx        # Advanced filtering component
│   │   ├── file-upload.tsx            # File upload component
│   │   └── msw-provider.tsx           # MSW initialization
│   ├── hooks/                         # Custom React hooks
│   │   ├── use-auth.ts                # Authentication hook
│   │   ├── useObjects.ts              # Objects management
│   │   ├── useLocations.ts            # Locations management
│   │   ├── useLocationLevels.ts   # Location levels management
│   │   ├── useActionTypes.ts          # Action types management
│   │   ├── useActionRefTypes.ts       # Action reference types
│   │   ├── useActionReferences.ts     # Action references management
│   │   ├── useActions.ts              # Actions management
│   │   ├── useActs.ts                 # Acts management
│   │   ├── useEvents.ts               # Events management
│   │   ├── useOperationTypes.ts       # Operation types
│   │   ├── useOperations.ts           # Operations management
│   │   ├── useChecklists.ts           # Checklists management
│   │   ├── useLocomotiveModels.ts     # Locomotive models
│   │   ├── useLocomotives.ts          # Locomotives management
│   │   ├── useUsers.ts                # Users management
│   │   ├── useAnomalies.ts            # Anomalies management
│   │   ├── useIssues.ts               # Issues management
│   │   ├── useAssetItems.ts           # Asset items management
│   │   ├── useAssetModels.ts          # Asset models management
│   │   ├── useProcedures.ts           # Procedures management
│   │   ├── useQuestions.ts            # Questions management
│   │   ├── useResponses.ts            # Responses management
│   │   ├── use-debounce.ts            # Debounce utility hook
│   │   ├── use-disclosure.ts          # Disclosure state hook
│   │   ├── use-mobile.tsx             # Mobile detection hook
│   │   └── use-toast.ts               # Toast notification hook
│   ├── lib/                           # Utility libraries
│   │   ├── api/                       # API client functions
│   │   │   ├── api.ts                 # Base API request function
│   │   │   ├── objects.ts             # Objects API client
│   │   │   ├── locations.ts           # Locations API client
│   │   │   ├── location-levels.ts  # Location levels API client
│   │   │   ├── action-types.ts       # Action types API client
│   │   │   ├── action-ref-types.ts   # Action reference types API
│   │   │   ├── action-references.ts   # Action references API client
│   │   │   ├── actions.ts             # Actions API client
│   │   │   ├── acts.ts                # Acts API client
│   │   │   ├── events.ts              # Events API client
│   │   │   ├── operation-types.ts     # Operation types API
│   │   │   ├── operations.ts          # Operations API client
│   │   │   ├── checklists.ts          # Checklists API client
│   │   │   ├── locomotive-models.ts   # Locomotive models API
│   │   │   ├── locomotives.ts         # Locomotives API client
│   │   │   ├── users.ts               # Users API client
│   │   │   ├── anomalies.ts           # Anomalies API client
│   │   │   ├── issues.ts              # Issues API client
│   │   │   ├── asset-items.ts         # Asset items API client
│   │   │   ├── asset-models.ts       # Asset models API client
│   │   │   ├── procedures.ts         # Procedures API client
│   │   │   ├── questions.ts          # Questions API client
│   │   │   └── responses.ts          # Responses API client
│   │   ├── auth.ts                    # Authentication utilities
│   │   ├── config.ts                  # Configuration
│   │   ├── date.ts                    # Date utilities
│   │   ├── localStorage.ts            # Local storage utilities
│   │   ├── queryClient.ts             # React Query configuration
│   │   └── utils.ts                   # General utilities
│   ├── mocks/                         # Mock Service Worker setup
│   │   ├── data.ts                    # Mock data definitions
│   │   ├── handlers/                  # MSW request handlers
│   │   │   ├── auth.ts                # Authentication handlers
│   │   │   └── smartlogbook.ts        # Entity handlers
│   │   ├── browser.ts                 # MSW browser setup
│   │   └── server.ts                  # MSW server setup
│   └── shared/                        # Shared types and schemas
│       └── zod-schemas.ts             # Zod validation schemas
├── public/                            # Static assets
├── docs/                              # Documentation
├── package.json                       # Dependencies
├── next.config.ts                     # Next.js configuration
├── tailwind.config.js                 # Tailwind CSS configuration
└── tsconfig.json                      # TypeScript configuration
```

## 🔧 Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library
- **React Query**: Data fetching and caching
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **Lucide React**: Icon library
- **React Dropzone**: File upload handling

### Mocking & Development
- **MSW (Mock Service Worker)**: API mocking
- **Mock Data**: Realistic test data
- **Development Tools**: Hot reload, TypeScript checking

### File Management
- **File Upload**: Complete file upload system
- **Azure Blob Storage**: Cloud file storage integration
- **Image Processing**: Image optimization and resizing
- **File Validation**: Type and size validation

### Future Backend Integration
- **.NET Core**: Backend API framework
- **SQL Server**: Database
- **Azure AD B2C**: Authentication
- **Azure Blob Storage**: File storage

## 🔄 API Architecture Patterns

### 1. Hybrid API Pattern

**Development Mode**:
```typescript
// MSW intercepts requests
const response = await fetch('/api/objects');
// → MSW handler processes request
// → Returns mock data
```

**Production Mode**:
```typescript
// API route processes request
const response = await fetch('/api/objects');
// → Next.js API route
// → Business logic
// → Real backend call
// → Database query
// → Response
```

### 2. Business Logic Layer

Each API route contains:
- **Input Validation**: Request data validation
- **Business Rules**: Domain-specific logic
- **Error Handling**: Comprehensive error responses
- **Data Transformation**: Format conversion
- **Response Formatting**: Consistent response structure

### 3. Data Flow Pattern

```
Frontend Component
    ↓ (useQuery/useMutation)
Custom Hook (useObjects)
    ↓ (apiRequest)
API Client (objects.ts)
    ↓ (fetch)
API Route (/api/objects)
    ↓ (business logic)
Mock Handler (MSW) / Real Backend
    ↓ (data processing)
Response
    ↓ (data transformation)
Frontend State
```

## 🎯 Key Architectural Decisions

### 1. Why Hybrid API Approach?

**Benefits**:
- ✅ **Development Speed**: Mock data enables rapid frontend development
- ✅ **Backend Independence**: Frontend can be developed without backend
- ✅ **Easy Integration**: Simple switch from mock to real API
- ✅ **Business Logic Preservation**: API routes contain real business logic
- ✅ **Production Ready**: API routes work in production

**Implementation**:
```typescript
// API route contains business logic
export async function GET(request: NextRequest) {
  // In development: MSW intercepts
  // In production: This code executes
  return NextResponse.json(mockObjects);
}
```

### 2. Why MSW Over Other Mocking Solutions?

**MSW Advantages**:
- ✅ **Network-level Interception**: Intercepts actual HTTP requests
- ✅ **Realistic Behavior**: Mimics real API behavior
- ✅ **Development Experience**: Works with existing fetch/axios code
- ✅ **Production Safety**: Automatically disabled in production
- ✅ **Type Safety**: Full TypeScript support

### 3. Why Next.js API Routes?

**Benefits**:
- ✅ **Co-location**: API routes next to frontend code
- ✅ **Type Safety**: Shared TypeScript types
- ✅ **Development**: Single development environment
- ✅ **Deployment**: Single deployment unit
- ✅ **Business Logic**: Contains real business logic for production

## 🔒 Security Architecture

### Authentication Flow
```
User Login → Microsoft AD B2C → JWT Token → Session Management → API Authorization
```

### Security Layers
1. **Frontend**: Input validation, XSS protection
2. **API Routes**: Request validation, authentication checks
3. **Business Logic**: Authorization, data sanitization
4. **Database**: SQL injection prevention, access control

### Data Protection
- **Input Validation**: Zod schemas for all inputs
- **Error Handling**: No sensitive data in error messages
- **Session Management**: Secure token handling
- **CORS**: Proper cross-origin configuration

## 📊 Performance Architecture

### Caching Strategy
- **React Query**: Client-side caching
- **Next.js**: Static generation where possible
- **API Routes**: Response caching headers
- **CDN**: Static asset delivery

### Optimization Techniques
- **Code Splitting**: Dynamic imports for large components
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Webpack bundle analyzer
- **Lazy Loading**: Component lazy loading

## 🚀 Deployment Architecture

### Development Environment
```
Local Development → MSW Mocking → Hot Reload → TypeScript Checking
```

### Production Environment
```
Build → Static Assets → API Routes → Real Backend → Database
```

### Deployment Options
1. **Vercel**: Full-stack deployment
2. **Azure**: Container deployment
3. **Docker**: Containerized deployment
4. **Static**: Frontend-only deployment

## 🔄 Migration Strategy

### Phase 1: Development (Current)
- ✅ MSW mocking active
- ✅ API routes contain business logic
- ✅ Frontend development complete

### Phase 2: Backend Integration
- 🔄 Remove MSW from production
- 🔄 Update API_BASE_URL
- 🔄 Connect to real backend
- 🔄 Database integration

### Phase 3: Production
- 🔄 Microsoft AD B2C integration
- 🔄 File upload implementation
- 🔄 Real-time features
- 🔄 Performance optimization

## 📈 Scalability Considerations

### Frontend Scalability
- **Component Architecture**: Reusable, composable components
- **State Management**: React Query for server state
- **Code Splitting**: Dynamic imports for large features
- **Bundle Optimization**: Tree shaking, dead code elimination

### API Scalability
- **Stateless Design**: No server-side state
- **Horizontal Scaling**: Multiple API instances
- **Caching**: Response caching strategies
- **Rate Limiting**: API rate limiting

### Database Scalability
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries
- **Read Replicas**: Read/write separation
- **Caching**: Database query caching

## 🎯 Best Practices Implemented

### Code Organization
- ✅ **Feature-based Structure**: Related code grouped together
- ✅ **Separation of Concerns**: Clear layer separation
- ✅ **Reusability**: Shared components and utilities
- ✅ **Type Safety**: Full TypeScript implementation

### Development Practices
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Validation**: Input validation throughout
- ✅ **Testing**: Structure ready for testing
- ✅ **Documentation**: Comprehensive documentation

### Performance Practices
- ✅ **Lazy Loading**: Component lazy loading
- ✅ **Caching**: React Query caching
- ✅ **Optimization**: Bundle optimization
- ✅ **Monitoring**: Error tracking ready

This architecture provides a solid foundation for the SmartLogBook application, enabling rapid development while maintaining production readiness and scalability.
