# Anomaly Management - SmartLogBook

## 📋 Overview

The Anomaly Management system in SmartLogBook provides comprehensive tracking and management of defects, issues, and anomalies discovered during locomotive inspections. It enables efficient defect reporting, tracking, and resolution while maintaining complete audit trails and supporting quality assurance processes.

## 🎯 Objectives

- **Defect Tracking**: Track and manage defects discovered during inspections
- **Status Management**: Manage anomaly status throughout resolution lifecycle
- **Resolution Process**: Support defect resolution and validation
- **Audit Trail**: Maintain complete audit trail of anomaly handling
- **Quality Assurance**: Ensure proper defect handling and resolution
- **Reporting**: Generate comprehensive anomaly reports and analytics

## 🏗️ Architecture

### Anomaly Management Structure
```
Anomaly Management
├── Anomaly Detection (During Inspections)
├── Anomaly Reporting (Defect Documentation)
├── Status Tracking (Open, In Progress, Resolved)
├── Resolution Process (Fix Implementation)
├── Validation (Resolution Verification)
└── Reporting (Analytics and Trends)
```

### Anomaly Lifecycle
```
Detection → Reporting → Assignment → Resolution → Validation → Closure
```

## 🔧 Implementation Details

### 1. Anomaly Structure

#### Anomaly Entity
```typescript
interface Anomaly {
  id: number;                    // Unique anomaly identifier
  checklistId: number;          // Associated checklist identifier
  checklist: Checklist;         // Checklist details
  conductorId: number;          // Reporting conductor identifier
  conductor: User;              // Conductor details
  locomotiveId: number;         // Associated locomotive identifier
  locomotive: Locomotive;       // Locomotive details
  objectId: number;             // Associated object identifier
  object: Object;               // Object details
  locationId: number;           // Anomaly location identifier
  location: Location;           // Location details
  defectCode: string;           // Defect code (e.g., "OBS05")
  description: string;          // Detailed anomaly description
  severity: AnomalySeverity;    // Anomaly severity level
  status: AnomalyStatus;       // Current status
  reportedAt: string;           // Reporting timestamp
  assignedTo?: number;          // Assigned technician identifier
  assignedAt?: string;          // Assignment timestamp
  resolvedAt?: string;          // Resolution timestamp
  resolvedBy?: number;          // Resolving technician identifier
  resolution?: string;          // Resolution description
  media: MediaFile[];          // Associated media files
  comments: AnomalyComment[];   // Anomaly comments
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Anomaly Severity Levels
```typescript
enum AnomalySeverity {
  LOW = 'low',                  // Low priority issues
  MEDIUM = 'medium',            // Medium priority issues
  HIGH = 'high',                // High priority issues
  CRITICAL = 'critical'         // Critical safety issues
}
```

#### Anomaly Status
```typescript
enum AnomalyStatus {
  OPEN = 'open',                // Newly reported anomaly
  IN_PROGRESS = 'in_progress',  // Being worked on
  RESOLVED = 'resolved',        // Resolved and awaiting validation
  CLOSED = 'closed',           // Validated and closed
  CANCELLED = 'cancelled'       // Cancelled or false alarm
}
```

### 2. Defect Code Management

#### Defect Code Structure
```typescript
interface DefectCode {
  code: string;                  // Defect code (e.g., "OBS05")
  description: string;           // Defect description
  category: string;              // Defect category
  severity: AnomalySeverity;     // Default severity
  isActive: boolean;            // Active status
  resolutionTime: number;        // Expected resolution time (hours)
}
```

#### Common Defect Codes
- **OBS05**: Temperature-related issues
- **OBS07**: Non-conformity issues
- **OBS12**: Mechanical defects
- **OBS15**: Electrical problems
- **OBS20**: Safety concerns
- **OBS25**: Hydraulic issues
- **OBS30**: Pneumatic problems

### 3. Anomaly Reporting Process

#### Reporting Workflow
```typescript
interface AnomalyReport {
  anomalyId: number;             // Anomaly identifier
  reporterId: number;            // Reporter identifier
  reportType: ReportType;        // Report type
  description: string;           // Detailed description
  location: string;             // Anomaly location
  media: MediaFile[];           // Supporting media
  urgency: UrgencyLevel;        // Urgency level
  reportedAt: string;           // Reporting timestamp
}
```

#### Report Types
- **Inspection**: Anomaly found during inspection
- **Maintenance**: Anomaly found during maintenance
- **Operational**: Anomaly found during operation
- **Safety**: Safety-related anomaly

### 4. Resolution Process

#### Resolution Workflow
```typescript
interface AnomalyResolution {
  anomalyId: number;             // Anomaly identifier
  assignedTo: number;            // Assigned technician
  assignedAt: string;            // Assignment timestamp
  estimatedResolution: string;   // Estimated resolution date
  actualResolution?: string;     // Actual resolution date
  resolutionType: ResolutionType; // Resolution type
  resolutionDescription: string; // Resolution description
  partsUsed: string[];          // Parts used in resolution
  laborHours: number;           // Labor hours spent
  cost: number;                // Resolution cost
  validatedBy?: number;         // Validation technician
  validatedAt?: string;         // Validation timestamp
}
```

#### Resolution Types
- **Repair**: Direct repair of the issue
- **Replacement**: Component replacement
- **Adjustment**: System adjustment
- **Maintenance**: Preventive maintenance
- **Monitoring**: Enhanced monitoring

## 📱 Use Cases

### 1. Anomaly Detection and Reporting
**Scenario**: Conductor discovers a temperature anomaly during inspection.

**Steps**:
1. Conductor performs inspection on mobile device
2. During temperature check, anomaly detected
3. System prompts for anomaly reporting
4. Conductor selects:
   - Defect code: "OBS05 - Temperature"
   - Severity: "High"
   - Description: "Temperature gauge reading 95°C, normal range 80-85°C"
5. Conductor captures photo of gauge
6. System automatically records:
   - Location: "Boîte d'essieux"
   - Object: "Temperature Gauge"
   - Locomotive: "1024"
   - Timestamp: Current time
7. Anomaly reported and status set to "Open"

**Expected Result**: Anomaly properly documented and reported for resolution.

### 2. Anomaly Assignment and Resolution
**Scenario**: Manager assigns anomaly to technician for resolution.

**Steps**:
1. Manager accesses anomaly management dashboard
2. Reviews open anomalies
3. Selects temperature anomaly (OBS05)
4. Assigns to technician: "John Smith"
5. Sets priority: "High"
6. Sets estimated resolution: "2024-01-15"
7. Technician receives notification
8. Technician accesses anomaly details
9. Performs resolution:
   - Replaces temperature sensor
   - Tests functionality
   - Updates resolution details
10. Marks anomaly as "Resolved"

**Expected Result**: Anomaly assigned, resolved, and tracked through completion.

### 3. Anomaly Validation and Closure
**Scenario**: Validating resolved anomaly and closing the case.

**Steps**:
1. Manager reviews resolved anomalies
2. Selects temperature anomaly for validation
3. Reviews resolution details:
   - Resolution type: "Replacement"
   - Parts used: "Temperature Sensor TS-001"
   - Labor hours: 2 hours
   - Cost: €150
4. Performs validation inspection
5. Confirms resolution is effective
6. Updates anomaly status to "Closed"
7. System generates closure report

**Expected Result**: Anomaly validated and properly closed with complete documentation.

### 4. Anomaly Analytics and Reporting
**Scenario**: Analyzing anomaly patterns and trends.

**Steps**:
1. Access anomaly analytics dashboard
2. Select analysis period: "Last 6 months"
3. Review anomaly trends:
   - Total anomalies: 45
   - Resolution rate: 95%
   - Average resolution time: 3.2 days
   - Most common defects: OBS05, OBS07
4. Analyze by locomotive:
   - Locomotive 1024: 8 anomalies
   - Locomotive 1023: 5 anomalies
5. Generate trend reports
6. Identify improvement areas

**Expected Result**: Comprehensive analysis of anomaly patterns and performance.

## 🔍 Search and Filtering

### 1. Anomaly Search Features

#### Filter Options
```typescript
interface AnomalyFilters {
  status?: AnomalyStatus;       // Filter by status
  severity?: AnomalySeverity;    // Filter by severity
  defectCode?: string;          // Filter by defect code
  locomotiveId?: number;        // Filter by locomotive
  conductorId?: number;         // Filter by conductor
  assignedTo?: number;          // Filter by assigned technician
  dateRange?: DateRange;        // Filter by date range
  locationId?: number;          // Filter by location
}
```

#### Advanced Search
- **Status-based Search**: Find anomalies by status
- **Severity Search**: Filter by severity levels
- **Defect Code Search**: Find specific defect types
- **Locomotive Search**: Filter by locomotive

### 2. Search Implementation
```typescript
// Anomaly search functionality
export function useAnomalySearch() {
  const [filters, setFilters] = useState<AnomalyFilters>({});
  const [results, setResults] = useState<Anomaly[]>([]);
  
  const searchAnomalies = useCallback(async (searchFilters: AnomalyFilters) => {
    const queryParams = new URLSearchParams();
    
    if (searchFilters.status) queryParams.append('status', searchFilters.status);
    if (searchFilters.severity) queryParams.append('severity', searchFilters.severity);
    if (searchFilters.defectCode) queryParams.append('defectCode', searchFilters.defectCode);
    if (searchFilters.locomotiveId) {
      queryParams.append('locomotiveId', searchFilters.locomotiveId.toString());
    }
    
    const response = await fetch(`/api/anomalies/search?${queryParams}`);
    const data = await response.json();
    setResults(data);
  }, []);
  
  return { filters, results, searchAnomalies, setFilters };
}
```

## 📊 Data Management

### 1. Database Schema

#### Anomalies Table
```sql
CREATE TABLE Anomalies (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ChecklistId INT FOREIGN KEY REFERENCES Checklists(Id),
    ConductorId INT FOREIGN KEY REFERENCES Users(Id),
    LocomotiveId INT FOREIGN KEY REFERENCES Locomotives(Id),
    ObjectId INT FOREIGN KEY REFERENCES Objects(Id),
    LocationId INT FOREIGN KEY REFERENCES Locations(Id),
    DefectCode NVARCHAR(20) NOT NULL,
    Description NVARCHAR(1000) NOT NULL,
    Severity NVARCHAR(20) NOT NULL,
    Status NVARCHAR(20) DEFAULT 'open',
    ReportedAt DATETIME2 DEFAULT GETDATE(),
    AssignedTo INT FOREIGN KEY REFERENCES Users(Id),
    AssignedAt DATETIME2,
    ResolvedAt DATETIME2,
    ResolvedBy INT FOREIGN KEY REFERENCES Users(Id),
    Resolution NVARCHAR(1000),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Anomaly indexes
CREATE INDEX IX_Anomalies_Status ON Anomalies (Status);
CREATE INDEX IX_Anomalies_Severity ON Anomalies (Severity);
CREATE INDEX IX_Anomalies_DefectCode ON Anomalies (DefectCode);
CREATE INDEX IX_Anomalies_LocomotiveId ON Anomalies (LocomotiveId);
CREATE INDEX IX_Anomalies_ReportedAt ON Anomalies (ReportedAt);
```

#### Anomaly Comments Table
```sql
CREATE TABLE AnomalyComments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    AnomalyId INT FOREIGN KEY REFERENCES Anomalies(Id),
    UserId INT FOREIGN KEY REFERENCES Users(Id),
    Comment NVARCHAR(1000) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

### 2. API Endpoints

#### Anomaly Management APIs
- `GET /api/anomalies` - List all anomalies with filtering
- `GET /api/anomalies/{id}` - Get specific anomaly details
- `POST /api/anomalies` - Create new anomaly
- `PUT /api/anomalies/{id}` - Update anomaly
- `DELETE /api/anomalies/{id}` - Delete anomaly
- `GET /api/anomalies/search` - Advanced search
- `PUT /api/anomalies/{id}/assign` - Assign anomaly
- `PUT /api/anomalies/{id}/resolve` - Resolve anomaly
- `PUT /api/anomalies/{id}/close` - Close anomaly
- `GET /api/anomalies/{id}/comments` - Get anomaly comments
- `POST /api/anomalies/{id}/comments` - Add comment

#### Request/Response Examples

#### Get Anomalies List
```typescript
GET /api/anomalies?status=open&severity=high

Response:
{
  "data": [
    {
      "id": 1,
      "checklistId": 1,
      "conductor": {
        "id": 1,
        "firstName": "John",
        "lastName": "Doe"
      },
      "locomotive": {
        "id": 1,
        "number": 1024
      },
      "object": {
        "id": 38,
        "name": "Temperature Gauge"
      },
      "location": {
        "id": 25,
        "name": "Boîte d'essieux"
      },
      "defectCode": "OBS05",
      "description": "Temperature gauge reading 95°C, normal range 80-85°C",
      "severity": "high",
      "status": "open",
      "reportedAt": "2024-01-01T10:00:00Z",
      "assignedTo": null,
      "assignedAt": null,
      "resolvedAt": null
    }
  ]
}
```

#### Create Anomaly
```typescript
POST /api/anomalies
{
  "checklistId": 1,
  "conductorId": 1,
  "locomotiveId": 1,
  "objectId": 38,
  "locationId": 25,
  "defectCode": "OBS05",
  "description": "Temperature gauge reading 95°C, normal range 80-85°C",
  "severity": "high"
}

Response:
{
  "success": true,
  "data": {
    "id": 2,
    "defectCode": "OBS05",
    "description": "Temperature gauge reading 95°C, normal range 80-85°C",
    "severity": "high",
    "status": "open",
    "reportedAt": "2024-01-01T10:00:00Z"
  }
}
```

## 🔄 Integration Points

### 1. Checklist Management
- **Anomaly Detection**: Anomalies detected during checklist execution
- **Checklist Context**: Anomalies linked to specific checklist actions
- **Execution Tracking**: Anomaly reporting tracked in checklist execution
- **Result Integration**: Anomaly results integrated into checklist results

### 2. Mobile Application
- **Anomaly Reporting**: Mobile app enables anomaly reporting
- **Media Capture**: Mobile app captures supporting media
- **Offline Support**: Anomalies can be reported offline
- **Synchronization**: Anomaly data synchronized with backend

### 3. Maintenance Management
- **Resolution Planning**: Anomalies drive maintenance planning
- **Work Order Integration**: Anomalies generate maintenance work orders
- **Resolution Tracking**: Maintenance resolution tracked
- **Cost Tracking**: Resolution costs tracked and analyzed

### 4. Reporting System
- **Anomaly Analytics**: Analyze anomaly patterns and trends
- **Performance Reports**: Generate anomaly performance reports
- **Compliance Reporting**: Report anomaly handling compliance
- **Trend Analysis**: Track anomaly trends over time

## 📈 Performance Considerations

### 1. Data Optimization
- **Anomaly Caching**: Frequently accessed anomalies cached
- **Status Indexing**: Database indexes on status fields
- **Lazy Loading**: Anomaly details loaded on demand
- **Pagination**: Large anomaly lists paginated

### 2. Search Performance
- **Indexed Searches**: Database indexes on search fields
- **Result Caching**: Search results cached temporarily
- **Async Operations**: Non-blocking search operations
- **Filter Optimization**: Efficient filter query execution

### 3. Mobile Performance
- **Offline Support**: Anomalies can be reported offline
- **Data Synchronization**: Efficient anomaly data sync
- **Media Optimization**: Optimized media handling
- **Progressive Loading**: Anomalies loaded progressively

## 🧪 Testing Strategy

### 1. Unit Tests
- **Anomaly CRUD**: Test anomaly management operations
- **Status Management**: Test status update operations
- **Search Functionality**: Test search and filtering
- **Validation**: Test input validation and error handling

### 2. Integration Tests
- **API Endpoints**: Test all anomaly management APIs
- **Database Integration**: Test database operations
- **Mobile Integration**: Test mobile anomaly reporting
- **Workflow Integration**: Test anomaly workflow processes

### 3. User Acceptance Tests
- **Anomaly Reporting**: Test complete anomaly reporting workflow
- **Resolution Process**: Test anomaly resolution process
- **Validation Process**: Test anomaly validation process
- **Mobile Workflow**: Test mobile anomaly workflow

## 🚀 Future Enhancements

### 1. Advanced Features
- **Predictive Anomaly Detection**: AI-powered anomaly prediction
- **Automated Assignment**: Automatic anomaly assignment
- **Resolution Templates**: Predefined resolution templates
- **Anomaly Analytics**: Advanced anomaly analytics

### 2. Integration Improvements
- **IoT Integration**: Connect anomalies with IoT sensors
- **Maintenance Systems**: Integration with maintenance management systems
- **Quality Systems**: Integration with quality management systems
- **Real-time Monitoring**: Real-time anomaly monitoring

### 3. User Experience
- **Visual Anomaly Browser**: Visual anomaly management interface
- **Interactive Reporting**: Interactive anomaly reporting
- **Mobile Optimization**: Enhanced mobile anomaly interface
- **Offline Support**: Complete offline anomaly management

## 📚 Related Documentation

- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)
- [Maintenance Management](./MAINTENANCE_MANAGEMENT.md)
- [Reporting System](./REPORTING_SYSTEM.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook Anomaly Management system, including implementation details, use cases, and integration points. For technical implementation details, refer to the source code and API documentation.*
