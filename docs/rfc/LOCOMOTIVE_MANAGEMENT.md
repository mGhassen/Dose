# Locomotive Management - SmartLogBook

## 📋 Overview

The Locomotive Management system in SmartLogBook provides comprehensive management of railway locomotives, including both locomotive models and individual locomotive units. It serves as the foundation for inspection and maintenance operations by cataloging locomotive specifications, tracking individual units, and managing their operational status.

## 🎯 Objectives

- **Model Management**: Manage locomotive models and their technical specifications
- **Unit Tracking**: Track individual locomotive units and their status
- **Specification Management**: Store and manage technical specifications
- **Status Monitoring**: Monitor locomotive operational status
- **Maintenance Planning**: Support maintenance planning and scheduling
- **Inspection Support**: Enable locomotive-specific inspection procedures

## 🏗️ Architecture

### Locomotive Management Structure
```
Locomotive Management
├── Locomotive Models (Technical Specifications)
│   ├── Model Definitions (G1000, G2000, etc.)
│   ├── Technical Attributes (Power, Weight, Dimensions)
│   ├── Component Specifications (Engine, Brakes, etc.)
│   └── Maintenance Requirements
└── Individual Locomotives (Unit Tracking)
    ├── Unit Identification (Serial Numbers)
    ├── Model Association (Links to Models)
    ├── Operational Status (Active, Inactive, Maintenance)
    └── Maintenance History
```

### Data Flow
```
Model Definition → Unit Creation → Status Tracking → Maintenance Planning → Inspection Execution
```

## 🔧 Implementation Details

### 1. Locomotive Model Structure

#### Locomotive Model Entity
```typescript
interface LocomotiveModel {
  id: number;                    // Unique model identifier
  name: string;                  // Model name (e.g., "G1000")
  description: string;           // Model description
  manufacturer: string;          // Manufacturer name
  attributes: ModelAttribute[];  // Technical specifications
  isActive: boolean;            // Model active status
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Model Attributes
```typescript
interface ModelAttribute {
  id: number;                    // Attribute identifier
  name: string;                  // Attribute name
  value: string;                 // Attribute value
  unit: string;                  // Measurement unit
  category: string;              // Attribute category
  isRequired: boolean;          // Required for inspection
}
```

#### Common Model Attributes
- **Power**: Engine power rating (kW, HP)
- **Weight**: Total locomotive weight (tons)
- **Dimensions**: Length, width, height (meters)
- **Speed**: Maximum operating speed (km/h)
- **Fuel Capacity**: Fuel tank capacity (liters)
- **Brake System**: Brake system specifications
- **Electrical System**: Electrical specifications

### 2. Individual Locomotive Structure

#### Locomotive Entity
```typescript
interface Locomotive {
  id: number;                    // Unique locomotive identifier
  modelId: number;              // Associated model identifier
  model: LocomotiveModel;       // Model details
  number: number;               // Locomotive number
  serialNumber: string;         // Serial number
  status: LocomotiveStatus;     // Operational status
  commissioningDate: string;    // Commissioning date
  lastMaintenanceDate?: string; // Last maintenance date
  nextMaintenanceDate?: string; // Next maintenance date
  mileage: number;              // Total mileage
  operatingHours: number;       // Total operating hours
  isActive: boolean;            // Active status
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Locomotive Status
```typescript
enum LocomotiveStatus {
  ACTIVE = 'active',            // In active service
  INACTIVE = 'inactive',        // Not in service
  MAINTENANCE = 'maintenance',  // Under maintenance
  REPAIR = 'repair',           // Under repair
  RETIRED = 'retired'          // Retired from service
}
```

### 3. Model-Unit Relationship

#### Relationship Management
```typescript
interface ModelUnitRelationship {
  modelId: number;              // Model identifier
  unitId: number;               // Unit identifier
  isPrimary: boolean;           // Primary model association
  associationDate: string;      // Association date
  notes?: string;               // Association notes
}
```

#### Relationship Features
- **Model Inheritance**: Units inherit model specifications
- **Custom Attributes**: Units can have custom attributes
- **Status Tracking**: Track unit-specific status
- **Maintenance History**: Unit-specific maintenance records

### 4. Maintenance Integration

#### Maintenance Planning
```typescript
interface MaintenancePlan {
  locomotiveId: number;          // Locomotive identifier
  maintenanceType: string;      // Type of maintenance
  scheduledDate: string;        // Scheduled date
  estimatedDuration: number;    // Estimated duration (hours)
  requiredParts: string[];      // Required parts
  assignedTechnician?: number;  // Assigned technician
  status: MaintenanceStatus;    // Maintenance status
}
```

#### Maintenance Status
```typescript
enum MaintenanceStatus {
  SCHEDULED = 'scheduled',      // Scheduled maintenance
  IN_PROGRESS = 'in_progress',  // Maintenance in progress
  COMPLETED = 'completed',      // Maintenance completed
  CANCELLED = 'cancelled'       // Maintenance cancelled
}
```

## 📱 Use Cases

### 1. Locomotive Model Creation
**Scenario**: Adding a new locomotive model to the system.

**Steps**:
1. Navigate to Locomotive Models Management
2. Click "Add Model" button
3. Fill in model details:
   - Name: "G2000"
   - Description: "VOSSLOH G2000 LOCOMOTIVE"
   - Manufacturer: "Vossloh"
4. Add technical attributes:
   - Power: 2000 kW
   - Weight: 120 tons
   - Length: 18.5 meters
   - Width: 3.0 meters
   - Height: 4.2 meters
   - Max Speed: 120 km/h
5. Set active status
6. Save model

**Expected Result**: New locomotive model created with complete specifications.

### 2. Individual Locomotive Registration
**Scenario**: Registering a new locomotive unit.

**Steps**:
1. Navigate to Locomotives Management
2. Click "Add Locomotive" button
3. Select model: "G1000"
4. Fill in unit details:
   - Number: 1024
   - Serial Number: "VSL-G1000-1024"
   - Commissioning Date: "2023-06-15"
5. Set initial status: "Active"
6. Set initial mileage: 0 km
7. Set initial operating hours: 0 hours
8. Save locomotive

**Expected Result**: New locomotive unit registered and linked to model.

### 3. Status Management
**Scenario**: Updating locomotive status for maintenance.

**Steps**:
1. Access locomotive details page
2. Select locomotive: "1024"
3. Change status from "Active" to "Maintenance"
4. Add maintenance details:
   - Maintenance type: "Scheduled Service"
   - Scheduled date: "2024-01-15"
   - Estimated duration: 8 hours
5. Assign technician
6. Update maintenance schedule
7. Save changes

**Expected Result**: Locomotive status updated and maintenance scheduled.

### 4. Inspection Preparation
**Scenario**: Preparing inspection checklist for specific locomotive.

**Steps**:
1. Select locomotive for inspection
2. System automatically:
   - Loads model specifications
   - Filters relevant checklists
   - Applies model-specific requirements
3. Review locomotive details:
   - Model: G1000
   - Number: 1024
   - Status: Active
   - Last maintenance: 2024-01-01
4. Select appropriate checklist
5. Begin inspection

**Expected Result**: Inspection prepared with locomotive-specific context.

## 🔍 Search and Filtering

### 1. Locomotive Search Features

#### Filter Options
```typescript
interface LocomotiveFilters {
  modelId?: number;             // Filter by model
  number?: number;              // Filter by locomotive number
  status?: LocomotiveStatus;    // Filter by status
  isActive?: boolean;          // Filter by active status
  manufacturer?: string;        // Filter by manufacturer
  dateRange?: DateRange;        // Filter by date range
}
```

#### Advanced Search
- **Model-based Search**: Find locomotives by model
- **Status Search**: Filter by operational status
- **Number Search**: Find specific locomotive numbers
- **Maintenance Search**: Find locomotives due for maintenance

### 2. Search Implementation
```typescript
// Locomotive search functionality
export function useLocomotiveSearch() {
  const [filters, setFilters] = useState<LocomotiveFilters>({});
  const [results, setResults] = useState<Locomotive[]>([]);
  
  const searchLocomotives = useCallback(async (searchFilters: LocomotiveFilters) => {
    const queryParams = new URLSearchParams();
    
    if (searchFilters.modelId) {
      queryParams.append('modelId', searchFilters.modelId.toString());
    }
    if (searchFilters.number) {
      queryParams.append('number', searchFilters.number.toString());
    }
    if (searchFilters.status) queryParams.append('status', searchFilters.status);
    if (searchFilters.isActive !== undefined) {
      queryParams.append('active', searchFilters.isActive.toString());
    }
    
    const response = await fetch(`/api/locomotives/search?${queryParams}`);
    const data = await response.json();
    setResults(data);
  }, []);
  
  return { filters, results, searchLocomotives, setFilters };
}
```

## 📊 Data Management

### 1. Database Schema

#### Locomotive Models Table
```sql
CREATE TABLE LocomotiveModels (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500),
    Manufacturer NVARCHAR(100),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Model indexes
CREATE INDEX IX_LocomotiveModels_Name ON LocomotiveModels (Name);
CREATE INDEX IX_LocomotiveModels_Manufacturer ON LocomotiveModels (Manufacturer);
CREATE INDEX IX_LocomotiveModels_Active ON LocomotiveModels (IsActive);
```

#### Locomotives Table
```sql
CREATE TABLE Locomotives (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ModelId INT FOREIGN KEY REFERENCES LocomotiveModels(Id),
    Number INT NOT NULL,
    SerialNumber NVARCHAR(100),
    Status NVARCHAR(20) DEFAULT 'active',
    CommissioningDate DATETIME2,
    LastMaintenanceDate DATETIME2,
    NextMaintenanceDate DATETIME2,
    Mileage INT DEFAULT 0,
    OperatingHours INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Locomotive indexes
CREATE INDEX IX_Locomomotives_ModelId ON Locomotives (ModelId);
CREATE INDEX IX_Locomomotives_Number ON Locomotives (Number);
CREATE INDEX IX_Locomomotives_Status ON Locomotives (Status);
CREATE INDEX IX_Locomomotives_Active ON Locomotives (IsActive);
```

#### Model Attributes Table
```sql
CREATE TABLE ModelAttributes (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ModelId INT FOREIGN KEY REFERENCES LocomotiveModels(Id),
    Name NVARCHAR(100) NOT NULL,
    Value NVARCHAR(200),
    Unit NVARCHAR(20),
    Category NVARCHAR(50),
    IsRequired BIT DEFAULT 0
);
```

### 2. API Endpoints

#### Locomotive Management APIs
- `GET /api/locomotivemodels` - List all locomotive models
- `GET /api/locomotivemodels/{id}` - Get specific model details
- `POST /api/locomotivemodels` - Create new model
- `PUT /api/locomotivemodels/{id}` - Update model
- `DELETE /api/locomotivemodels/{id}` - Delete model
- `GET /api/locomotives` - List all locomotives
- `GET /api/locomotives/{id}` - Get specific locomotive details
- `POST /api/locomotives` - Create new locomotive
- `PUT /api/locomotives/{id}` - Update locomotive
- `DELETE /api/locomotives/{id}` - Delete locomotive
- `GET /api/locomotives/search` - Advanced search
- `PUT /api/locomotives/{id}/status` - Update locomotive status

#### Request/Response Examples

#### Get Locomotives List
```typescript
GET /api/locomotives?modelId=2&status=active

Response:
{
  "data": [
    {
      "id": 1,
      "modelId": 2,
      "model": {
        "id": 2,
        "name": "G1000",
        "description": "VOSSLOH G1000 LOCOMOTIVE",
        "manufacturer": "Vossloh"
      },
      "number": 1023,
      "serialNumber": "VSL-G1000-1023",
      "status": "active",
      "commissioningDate": "2023-01-15T00:00:00Z",
      "lastMaintenanceDate": "2024-01-01T00:00:00Z",
      "nextMaintenanceDate": "2024-04-01T00:00:00Z",
      "mileage": 15000,
      "operatingHours": 1200,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Locomotive
```typescript
POST /api/locomotives
{
  "modelId": 2,
  "number": 1024,
  "serialNumber": "VSL-G1000-1024",
  "status": "active",
  "commissioningDate": "2023-06-15T00:00:00Z",
  "mileage": 0,
  "operatingHours": 0
}

Response:
{
  "success": true,
  "data": {
    "id": 2,
    "modelId": 2,
    "number": 1024,
    "serialNumber": "VSL-G1000-1024",
    "status": "active",
    "commissioningDate": "2023-06-15T00:00:00Z",
    "mileage": 0,
    "operatingHours": 0,
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

## 🔄 Integration Points

### 1. Checklist Management
- **Model-specific Checklists**: Checklists tailored to locomotive models
- **Unit-specific Context**: Checklists executed with unit context
- **Maintenance Integration**: Checklists linked to maintenance schedules
- **Status Validation**: Checklists validated against locomotive status

### 2. Maintenance Management
- **Maintenance Planning**: Locomotives drive maintenance schedules
- **Status Tracking**: Maintenance status tracked per locomotive
- **History Management**: Complete maintenance history per unit
- **Predictive Maintenance**: AI-powered maintenance predictions

### 3. Mobile Application
- **Locomotive Selection**: Mobile app locomotive selection
- **Model Information**: Mobile app displays model specifications
- **Status Display**: Mobile app shows locomotive status
- **Offline Support**: Locomotive data available offline

### 4. Reporting System
- **Locomotive Analytics**: Analyze locomotive performance
- **Maintenance Reports**: Generate maintenance reports
- **Status Reports**: Track locomotive status trends
- **Performance Metrics**: Track locomotive performance metrics

## 📈 Performance Considerations

### 1. Data Optimization
- **Model Caching**: Frequently accessed models cached
- **Status Indexing**: Database indexes on status fields
- **Lazy Loading**: Locomotive details loaded on demand
- **Pagination**: Large locomotive lists paginated

### 2. Search Performance
- **Indexed Searches**: Database indexes on search fields
- **Result Caching**: Search results cached temporarily
- **Async Operations**: Non-blocking search operations
- **Filter Optimization**: Efficient filter query execution

### 3. Mobile Performance
- **Offline Support**: Locomotive data available offline
- **Data Synchronization**: Efficient locomotive data sync
- **Status Caching**: Locomotive status cached locally
- **Progressive Loading**: Locomotives loaded progressively

## 🧪 Testing Strategy

### 1. Unit Tests
- **Model CRUD**: Test locomotive model management
- **Unit CRUD**: Test individual locomotive management
- **Status Management**: Test status update operations
- **Search Functionality**: Test search and filtering

### 2. Integration Tests
- **API Endpoints**: Test all locomotive management APIs
- **Database Integration**: Test database operations
- **Model-Unit Integration**: Test model-unit relationships
- **Mobile Integration**: Test mobile locomotive handling

### 3. User Acceptance Tests
- **Model Creation**: Test complete model creation workflow
- **Unit Registration**: Test locomotive unit registration
- **Status Management**: Test status update process
- **Mobile Workflow**: Test mobile locomotive workflow

## 🚀 Future Enhancements

### 1. Advanced Features
- **Predictive Maintenance**: AI-powered maintenance predictions
- **IoT Integration**: Connect locomotives with IoT sensors
- **Performance Analytics**: Advanced locomotive performance analytics
- **Fleet Management**: Comprehensive fleet management features

### 2. Integration Improvements
- **ERP Integration**: Connect with enterprise resource planning
- **Maintenance Systems**: Integration with maintenance management systems
- **Asset Management**: Integration with asset management systems
- **Real-time Tracking**: Real-time locomotive tracking

### 3. User Experience
- **Visual Locomotive Browser**: 3D visualization of locomotives
- **Interactive Specifications**: Interactive technical specifications
- **Mobile Optimization**: Enhanced mobile locomotive interface
- **Offline Support**: Complete offline locomotive management

## 📚 Related Documentation

- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [Maintenance Management](./MAINTENANCE_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)
- [Reporting System](./REPORTING_SYSTEM.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook Locomotive Management system, including implementation details, use cases, and integration points. For technical implementation details, refer to the source code and API documentation.*
