# Operation Types Management - SmartLogBook

## 📋 Overview

The Operation Types Management system in SmartLogBook defines and manages the different types of operations that can be performed during locomotive inspections. It provides a structured approach to organizing inspection procedures by categorizing operations and enabling efficient checklist creation through standardized operation types.

## 🎯 Objectives

- **Operation Standardization**: Define standardized operation types for consistent inspections
- **Checklist Organization**: Organize checklists into logical operation groups
- **Sequential Management**: Enable sequential operation ordering within checklists
- **Reference Management**: Provide operation type references for checklist creation
- **Quality Assurance**: Ensure consistent operation procedures across all locomotives
- **Maintenance Planning**: Support operation-based maintenance planning

## 🏗️ Architecture

### Operation System Structure
```
Operation Types (Standardized Categories)
├── ALIMENTATION & CONTROLES (Power & Controls)
├── ARRET DU MD (Engine Stop)
├── LANCEMENT DU MD (Engine Start)
├── PRÉALABLES (Prerequisites)
└── [Additional Operation Types]

Checklist Integration
├── Operation Selection
├── Sequential Ordering
├── Action Assignment
└── Execution Tracking
```

### Operation-Checklist Relationship
```
Operation Type → Checklist Selection → Sequential Ordering → Action Assignment → Execution
```

## 🔧 Implementation Details

### 1. Operation Type Structure

#### Operation Entity
```typescript
interface OperationType {
  id: number;                    // Unique operation identifier
  name: string;                  // Operation name
  description: string;           // Detailed operation description
  category: string;              // Operation category
  isActive: boolean;            // Operation active status
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Common Operation Types
1. **ALIMENTATION & CONTROLES**
   - **Purpose**: Power and control system operations
   - **Description**: Operations related to power supply and control systems
   - **Examples**: Check power supply, verify control systems

2. **ARRET DU MD**
   - **Purpose**: Engine stop operations
   - **Description**: Procedures for safely stopping the main engine
   - **Examples**: Engine shutdown sequence, safety checks

3. **LANCEMENT DU MD**
   - **Purpose**: Engine start operations
   - **Description**: Procedures for starting the main engine
   - **Examples**: Pre-start checks, engine startup sequence

4. **PRÉALABLES**
   - **Purpose**: Prerequisite operations
   - **Description**: Initial operations that must be completed first
   - **Examples**: Safety checks, system initialization

### 2. Operation-Checklist Integration

#### Operation-Checklist Mapping
```typescript
interface ChecklistOperation {
  id: number;                    // Unique mapping identifier
  checklistId: number;          // Checklist identifier
  operationTypeId: number;      // Operation type identifier
  sequence: number;              // Execution sequence order
  isRequired: boolean;          // Required operation flag
  status: OperationStatus;      // Operation status
  startTime?: string;           // Operation start time
  endTime?: string;             // Operation end time
  comments?: string;             // Operation comments
}
```

#### Sequential Ordering
- **Sequence Numbers**: Operations ordered by sequence number
- **Dependencies**: Operations can have dependencies
- **Parallel Execution**: Some operations can run in parallel
- **Conditional Operations**: Operations based on previous results

### 3. Operation Execution Tracking

#### Execution Status
```typescript
enum OperationStatus {
  PENDING = 'pending',          // Not started
  IN_PROGRESS = 'in_progress',  // Currently executing
  COMPLETED = 'completed',       // Successfully completed
  FAILED = 'failed',           // Failed execution
  SKIPPED = 'skipped'          // Skipped operation
}
```

#### Execution Context
```typescript
interface OperationExecution {
  operationId: number;          // Operation identifier
  conductorId: number;          // Conductor identifier
  locomotiveId: number;        // Locomotive identifier
  startTime: string;           // Execution start time
  endTime?: string;            // Execution end time
  status: OperationStatus;     // Execution status
  results: OperationResult[];  // Operation results
  anomalies: Anomaly[];       // Reported anomalies
  media: MediaFile[];          // Captured media
}
```

### 4. Operation Reference System

#### Operation Reference
```typescript
interface OperationReference {
  id: number;                    // Reference identifier
  operationTypeId: number;      // Operation type identifier
  name: string;                 // Reference name
  description: string;           // Reference description
  procedures: Procedure[];       // Detailed procedures
  requiredTools: string[];      // Required tools
  estimatedDuration: number;    // Estimated duration in minutes
  safetyNotes: string[];        // Safety considerations
}
```

#### Procedure Details
- **Step-by-Step**: Detailed step-by-step procedures
- **Safety Requirements**: Safety requirements and precautions
- **Tool Requirements**: Required tools and equipment
- **Time Estimates**: Estimated completion times

## 📱 Use Cases

### 1. Operation Type Configuration
**Scenario**: System administrator needs to configure operation types for different inspection procedures.

**Steps**:
1. Navigate to Operation Types Management page
2. Review existing operation types:
   - ALIMENTATION & CONTROLES
   - ARRET DU MD
   - LANCEMENT DU MD
   - PRÉALABLES
3. Add new operation type: "VERIFICATION SYSTEMES"
4. Set description: "System verification operations"
5. Configure category: "Safety"
6. Set active status
7. Save configuration

**Expected Result**: New operation type available for checklist creation.

### 2. Checklist Creation with Operations
**Scenario**: Creating a checklist with sequential operations for PC (Preparation) event.

**Steps**:
1. Navigate to Checklist Management
2. Click "Create Checklist"
3. Select Event: "PC UM"
4. Add operations in sequence:
   - Sequence 1: PRÉALABLES
   - Sequence 2: ALIMENTATION & CONTROLES
   - Sequence 3: LANCEMENT DU MD
5. Configure each operation:
   - Set required status
   - Add operation-specific actions
   - Set estimated duration
6. Save checklist

**Expected Result**: Checklist created with properly ordered operations.

### 3. Mobile Operation Execution
**Scenario**: Conductor executing operations on mobile device during inspection.

**Steps**:
1. Open checklist on mobile app
2. Navigate to operation: "ALIMENTATION & CONTROLES"
3. System displays:
   - Operation description
   - Required actions
   - Safety notes
   - Estimated duration
4. Execute actions in sequence
5. Record results for each action
6. Mark operation as completed
7. Proceed to next operation

**Expected Result**: Operation executed with proper tracking and documentation.

### 4. Operation Performance Analysis
**Scenario**: Analyzing operation performance and identifying improvement areas.

**Steps**:
1. Access operation analytics dashboard
2. Select operation type: "LANCEMENT DU MD"
3. Review performance metrics:
   - Average completion time
   - Success rate
   - Common issues
   - Conductor performance
4. Identify trends and patterns
5. Generate improvement recommendations
6. Update operation procedures if needed

**Expected Result**: Operation performance analyzed and improvements identified.

## 🔍 Search and Filtering

### 1. Operation Search Features

#### Filter Options
```typescript
interface OperationFilters {
  name?: string;                 // Filter by operation name
  category?: string;             // Filter by operation category
  isActive?: boolean;           // Filter by active status
  hasChecklists?: boolean;      // Filter by checklist usage
  estimatedDuration?: DurationRange; // Filter by duration
}
```

#### Advanced Search
- **Name-based Search**: Find operations by name patterns
- **Category Search**: Filter by operation categories
- **Usage Search**: Find most frequently used operations
- **Duration Search**: Filter by estimated duration

### 2. Search Implementation
```typescript
// Operation search functionality
export function useOperationSearch() {
  const [filters, setFilters] = useState<OperationFilters>({});
  const [results, setResults] = useState<OperationType[]>([]);
  
  const searchOperations = useCallback(async (searchFilters: OperationFilters) => {
    const queryParams = new URLSearchParams();
    
    if (searchFilters.name) queryParams.append('name', searchFilters.name);
    if (searchFilters.category) queryParams.append('category', searchFilters.category);
    if (searchFilters.isActive !== undefined) {
      queryParams.append('active', searchFilters.isActive.toString());
    }
    
    const response = await fetch(`/api/operationtypes/search?${queryParams}`);
    const data = await response.json();
    setResults(data);
  }, []);
  
  return { filters, results, searchOperations, setFilters };
}
```

## 📊 Data Management

### 1. Database Schema

#### Operation Types Table
```sql
CREATE TABLE OperationTypes (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    Category NVARCHAR(100),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Operation type indexes
CREATE INDEX IX_OperationTypes_Name ON OperationTypes (Name);
CREATE INDEX IX_OperationTypes_Category ON OperationTypes (Category);
CREATE INDEX IX_OperationTypes_Active ON OperationTypes (IsActive);
```

#### Checklist Operations Table
```sql
CREATE TABLE ChecklistOperations (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ChecklistId INT FOREIGN KEY REFERENCES Checklists(Id),
    OperationTypeId INT FOREIGN KEY REFERENCES OperationTypes(Id),
    Sequence INT NOT NULL,
    IsRequired BIT DEFAULT 1,
    Status NVARCHAR(20) DEFAULT 'pending',
    StartTime DATETIME2,
    EndTime DATETIME2,
    Comments NVARCHAR(1000),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

### 2. API Endpoints

#### Operation Management APIs
- `GET /api/operationtypes` - List all operation types
- `GET /api/operationtypes/{id}` - Get specific operation type
- `POST /api/operationtypes` - Create new operation type
- `PUT /api/operationtypes/{id}` - Update operation type
- `DELETE /api/operationtypes/{id}` - Delete operation type
- `GET /api/operationtypes/search` - Advanced search
- `GET /api/operationtypes/{id}/checklists` - Get operation checklists
- `GET /api/operationtypes/categories` - Get operation categories

#### Request/Response Examples

#### Get Operation Types
```typescript
GET /api/operationtypes?category=Power

Response:
{
  "data": [
    {
      "id": 1,
      "name": "ALIMENTATION & CONTROLES",
      "description": "Power and control system operations",
      "category": "Power",
      "isActive": true,
      "checklistCount": 5,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "LANCEMENT DU MD",
      "description": "Main engine startup procedures",
      "category": "Engine",
      "isActive": true,
      "checklistCount": 3,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Operation Type
```typescript
POST /api/operationtypes
{
  "name": "VERIFICATION SYSTEMES",
  "description": "System verification operations",
  "category": "Safety",
  "isActive": true
}

Response:
{
  "success": true,
  "data": {
    "id": 5,
    "name": "VERIFICATION SYSTEMES",
    "description": "System verification operations",
    "category": "Safety",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

## 🔄 Integration Points

### 1. Checklist Management
- **Operation Selection**: Operations selected for checklists
- **Sequential Ordering**: Operations ordered by sequence
- **Execution Tracking**: Operation execution tracked
- **Result Integration**: Operation results integrated

### 2. Action Management
- **Action Assignment**: Actions assigned to operations
- **Action Sequencing**: Actions ordered within operations
- **Action Execution**: Actions executed within operation context
- **Action Results**: Action results aggregated at operation level

### 3. Mobile Application
- **Operation Display**: Mobile app shows operation details
- **Execution Interface**: Mobile app provides execution interface
- **Progress Tracking**: Mobile app tracks operation progress
- **Offline Support**: Operations available offline

### 4. Reporting System
- **Operation Analytics**: Analyze operation performance
- **Execution Reports**: Generate operation execution reports
- **Performance Metrics**: Track operation performance metrics
- **Compliance Reporting**: Report operation compliance

## 📈 Performance Considerations

### 1. Data Optimization
- **Operation Caching**: Frequently used operations cached
- **Category Indexing**: Database indexes on categories
- **Lazy Loading**: Operation details loaded on demand
- **Pagination**: Large operation lists paginated

### 2. Execution Performance
- **Status Tracking**: Efficient operation status tracking
- **Progress Updates**: Real-time progress updates
- **Result Aggregation**: Efficient result aggregation
- **Async Operations**: Non-blocking operation execution

### 3. Mobile Performance
- **Offline Support**: Operations available offline
- **Data Synchronization**: Efficient operation data sync
- **Progress Caching**: Operation progress cached locally
- **Progressive Loading**: Operations loaded progressively

## 🧪 Testing Strategy

### 1. Unit Tests
- **Operation CRUD**: Test operation management operations
- **Sequencing Logic**: Test operation sequencing
- **Search Functionality**: Test search and filtering
- **Validation**: Test input validation and error handling

### 2. Integration Tests
- **API Endpoints**: Test all operation management APIs
- **Database Integration**: Test database operations
- **Checklist Integration**: Test operation-checklist linking
- **Mobile Integration**: Test mobile operation handling

### 3. User Acceptance Tests
- **Operation Creation**: Test complete operation creation workflow
- **Checklist Integration**: Test operation-checklist integration
- **Execution Tracking**: Test operation execution tracking
- **Mobile Workflow**: Test mobile operation workflow

## 🚀 Future Enhancements

### 1. Advanced Features
- **Operation Templates**: Predefined operation templates
- **Operation Dependencies**: Define operation dependencies
- **Conditional Operations**: Operations based on conditions
- **Operation Analytics**: Advanced operation analytics

### 2. Integration Improvements
- **IoT Integration**: Connect operations with IoT sensors
- **Predictive Operations**: AI-powered operation prediction
- **Workflow Automation**: Automated operation workflows
- **Real-time Operations**: Real-time operation processing

### 3. User Experience
- **Visual Operation Builder**: Drag-and-drop operation creation
- **Operation Simulation**: Simulate operation scenarios
- **Mobile Optimization**: Enhanced mobile operation interface
- **Offline Support**: Complete offline operation management

## 📚 Related Documentation

- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [Action References](./ACTION_TYPES_AND_REFERENCES.md)
- [Events Management](./EVENTS_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook Operation Types Management system, including implementation details, use cases, and integration points. For technical implementation details, refer to the source code and API documentation.*
