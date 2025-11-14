# Action Types and References - SmartLogBook

## 📋 Overview

The Action Types and References system in SmartLogBook defines the standardized actions that can be performed on locomotive objects during inspections. It provides a structured approach to inspection procedures by categorizing actions and creating reusable action references that link specific actions to objects and checklists.

## 🎯 Objectives

- **Action Standardization**: Define standardized action types for consistent inspections
- **Reference Management**: Create reusable action references linking actions to objects
- **Checklist Integration**: Enable efficient checklist creation using predefined actions
- **Response Management**: Define expected response types for each action
- **Defect Tracking**: Associate defect codes with specific actions
- **Quality Assurance**: Ensure consistent inspection procedures across all locomotives

## 🏗️ Architecture

### Action System Structure
```
Action Types (4 predefined types)
├── Start (Make object functional)
├── Stop (Stop object operation)
├── Check (Observe without interaction)
└── Capture (Obtain required information)

Action References (Reusable combinations)
├── Action Type + Object + Response Type
├── Defect Codes + Description
├── Checklist Usage Tracking
└── Location Context
```

### Data Flow
```
Action Type → Action Reference → Checklist → Execution → Response
```

## 🔧 Implementation Details

### 1. Action Types Management

#### Predefined Action Types
In Lot 1, the system includes exactly 4 predefined action types:

```typescript
enum ActionType {
  START = 1,    // Action to make an object functional
  STOP = 2,     // Action to stop an object
  CHECK = 3,    // Observation without interaction
  CAPTURE = 4   // Observation to obtain required information
}
```

#### Action Type Structure
```typescript
interface ActionType {
  id: number;                    // Unique identifier (1-4)
  name: string;                  // Action name (Start, Stop, Check, Capture)
  description: string;           // Detailed description
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Action Type Details
1. **Start (ID: 1)**
   - **Purpose**: Make an object functional
   - **Description**: "Action on an object to make it function"
   - **Example**: Starting an engine, activating a system
   - **Interaction Level**: High (requires physical interaction)

2. **Stop (ID: 2)**
   - **Purpose**: Stop an object's operation
   - **Description**: "Action on an object to stop it"
   - **Example**: Stopping an engine, deactivating a system
   - **Interaction Level**: High (requires physical interaction)

3. **Check (ID: 3)**
   - **Purpose**: Visual inspection without interaction
   - **Description**: "Observation without interacting with the object"
   - **Example**: Visual inspection, reading gauges
   - **Interaction Level**: Low (observation only)

4. **Capture (ID: 4)**
   - **Purpose**: Obtain specific information
   - **Description**: "Observation allowing to obtain required information"
   - **Example**: Reading measurements, recording values
   - **Interaction Level**: Medium (may require interaction for measurement)

### 2. Action References Management

#### Action Reference Structure
```typescript
interface ActionReference {
  id: number;                    // Unique reference ID
  actionTypeId: number;          // Reference to action type (1-4)
  actionType: ActionType;        // Action type details
  act: string;                   // Category/type of act (e.g., "11 - Anomalie")
  responseType: string;          // Expected response type (e.g., "14 - Anomalie")
  description: string;            // Detailed action description
  objectIds: number[];           // Associated objects
  objects: Object[];             // Object details
  defectCodes: string[];         // Associated defect codes
  checklistUsage: string[];      // Checklists using this reference
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Action Reference Components
- **Action Type**: Links to one of the 4 predefined action types
- **Act Category**: Categorizes the type of act (e.g., Anomalie, Maintenance)
- **Response Type**: Defines expected response format
- **Object Association**: Links to specific objects
- **Defect Codes**: Predefined codes for common issues
- **Checklist Usage**: Tracks which checklists use this reference

### 3. Defect Code Management

#### Defect Code Structure
```typescript
interface DefectCode {
  code: string;                  // Defect code (e.g., "OBS05")
  description: string;           // Defect description
  category: string;              // Defect category
  severity: DefectSeverity;      // Severity level
  isActive: boolean;             // Active status
}
```

#### Common Defect Codes
- **OBS05**: Temperature-related issues
- **OBS07**: Non-conformity issues
- **OBS12**: Mechanical defects
- **OBS15**: Electrical problems
- **OBS20**: Safety concerns

### 4. Response Type Management

#### Response Type Structure
```typescript
interface ResponseType {
  id: number;                    // Response type ID
  name: string;                  // Response type name
  description: string;           // Response description
  format: ResponseFormat;        // Expected response format
  validation: ValidationRule[]; // Validation rules
}
```

#### Response Formats
- **Text**: Free text response
- **Numeric**: Numeric value with unit
- **Boolean**: Yes/No response
- **Selection**: Predefined options
- **Date/Time**: Date and time values
- **File**: File upload (images, documents)

## 📱 Use Cases

### 1. Action Type Configuration
**Scenario**: System administrator needs to review and configure action types.

**Steps**:
1. Navigate to Action Types management page
2. Review the 4 predefined action types:
   - Start, Stop, Check, Capture
3. Verify descriptions and details
4. Update descriptions if needed
5. Save changes

**Expected Result**: Action types are properly configured and available for reference creation.

### 2. Action Reference Creation
**Scenario**: Creating a new action reference for checking temperature gauges.

**Steps**:
1. Navigate to Action References page
2. Click "Add Action Reference"
3. Select Action Type: "Check" (ID: 3)
4. Set Act Category: "11 - Anomalie"
5. Set Response Type: "14 - Anomalie"
6. Add Description: "Check if temperature gauge is functional/stable"
7. Select Associated Objects: "Temperature Gauge", "Boîte d'essieux"
8. Add Defect Codes: "OBS05 - Température", "OBS07 - Non conforme"
9. Save reference

**Expected Result**: New action reference is created and available for checklist creation.

### 3. Checklist Integration
**Scenario**: Using action references to create a checklist.

**Steps**:
1. Create new checklist
2. Select operation type
3. Add actions from action references:
   - Select "Check temperature gauge" reference
   - System automatically populates:
     - Action type: Check
     - Objects: Temperature Gauge, Boîte d'essieux
     - Response type: Anomalie
     - Defect codes: OBS05, OBS07
4. Assign specific location for each action
5. Set execution sequence
6. Save checklist

**Expected Result**: Checklist created with standardized actions and proper object associations.

### 4. Mobile Execution
**Scenario**: Conductor executing checklist actions on mobile device.

**Steps**:
1. Open checklist on mobile app
2. Navigate to action: "Check temperature gauge"
3. System displays:
   - Action type: Check
   - Object: Temperature Gauge
   - Location: Boîte d'essieux
   - Expected response: Temperature reading
4. Conductor performs visual check
5. Records temperature value
6. If anomaly detected, selects defect code: OBS05
7. Adds comments if needed
8. Proceeds to next action

**Expected Result**: Action executed with proper data capture and anomaly reporting.

## 🔍 Search and Filtering

### 1. Action Reference Filters

#### Filter Options
```typescript
interface ActionReferenceFilters {
  actionTypeId?: number;         // Filter by action type
  act?: string;                  // Filter by act category
  objectId?: number;             // Filter by associated object
  responseType?: string;         // Filter by response type
  defectCode?: string;           // Filter by defect code
  checklistUsage?: string;       // Filter by checklist usage
}
```

#### Advanced Search
- **Multi-criteria**: Combine multiple filters
- **Object-based**: Find all actions for specific objects
- **Checklist-based**: Find actions used in specific checklists
- **Defect-based**: Find actions with specific defect codes

### 2. Search Implementation
```typescript
// Action reference search functionality
export function useActionReferenceSearch() {
  const [filters, setFilters] = useState<ActionReferenceFilters>({});
  const [results, setResults] = useState<ActionReference[]>([]);
  
  const searchReferences = useCallback(async (searchFilters: ActionReferenceFilters) => {
    const queryParams = new URLSearchParams();
    
    if (searchFilters.actionTypeId) {
      queryParams.append('actionTypeId', searchFilters.actionTypeId.toString());
    }
    if (searchFilters.objectId) {
      queryParams.append('objectId', searchFilters.objectId.toString());
    }
    if (searchFilters.defectCode) {
      queryParams.append('defectCode', searchFilters.defectCode);
    }
    
    const response = await fetch(`/api/actionreftypes/search?${queryParams}`);
    const data = await response.json();
    setResults(data);
  }, []);
  
  return { filters, results, searchReferences, setFilters };
}
```

## 📊 Data Management

### 1. Database Schema

#### Action Types Table
```sql
CREATE TABLE ActionTypes (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(50) NOT NULL,
    Description NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- Insert predefined action types
INSERT INTO ActionTypes (Id, Name, Description) VALUES
(1, 'Start', 'Action on an object to make it function'),
(2, 'Stop', 'Action on an object to stop it'),
(3, 'Check', 'Observation without interacting with the object'),
(4, 'Capture', 'Observation allowing to obtain required information');
```

#### Action References Table
```sql
CREATE TABLE ActionReferences (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ActionTypeId INT FOREIGN KEY REFERENCES ActionTypes(Id),
    Act NVARCHAR(100),
    ResponseType NVARCHAR(100),
    Description NVARCHAR(1000),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- Object-Action Reference junction table
CREATE TABLE ActionReferenceObjects (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ActionReferenceId INT FOREIGN KEY REFERENCES ActionReferences(Id),
    ObjectId INT FOREIGN KEY REFERENCES Objects(Id)
);

-- Defect codes table
CREATE TABLE DefectCodes (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Code NVARCHAR(20) NOT NULL UNIQUE,
    Description NVARCHAR(200),
    Category NVARCHAR(50),
    Severity NVARCHAR(20),
    IsActive BIT DEFAULT 1
);
```

### 2. API Endpoints

#### Action Types APIs
- `GET /api/actiontypes` - List all action types
- `GET /api/actiontypes/{id}` - Get specific action type
- `POST /api/actiontypes` - Create new action type
- `PUT /api/actiontypes/{id}` - Update action type
- `DELETE /api/actiontypes/{id}` - Delete action type

#### Action References APIs
- `GET /api/actionreftypes` - List all action references
- `GET /api/actionreftypes/{id}` - Get specific action reference
- `POST /api/actionreftypes` - Create new action reference
- `PUT /api/actionreftypes/{id}` - Update action reference
- `DELETE /api/actionreftypes/{id}` - Delete action reference
- `GET /api/actionreftypes/search` - Advanced search
- `GET /api/actionreftypes/{id}/objects` - Get associated objects
- `GET /api/actionreftypes/{id}/defectcodes` - Get defect codes

#### Request/Response Examples

#### Get Action References
```typescript
GET /api/actionreftypes?actionTypeId=3&objectId=38

Response:
{
  "data": [
    {
      "id": 56,
      "actionTypeId": 3,
      "actionType": {
        "id": 3,
        "name": "Check",
        "description": "Observation without interacting with the object"
      },
      "act": "11 - Anomalie",
      "responseType": "14 - Anomalie",
      "description": "Check if temperature gauge is functional/stable",
      "objects": [
        {
          "id": 38,
          "code": "ORG001",
          "name": "Organe boîte d'essieux"
        }
      ],
      "defectCodes": [
        {
          "code": "OBS05",
          "description": "Température"
        },
        {
          "code": "OBS07",
          "description": "Non conforme"
        }
      ],
      "checklistUsage": [
        "Visite à l'arrivée (VAR) en US",
        "Préparation courante (PC) en UM"
      ]
    }
  ]
}
```

#### Create Action Reference
```typescript
POST /api/actionreftypes
{
  "actionTypeId": 3,
  "act": "11 - Anomalie",
  "responseType": "14 - Anomalie",
  "description": "Check if temperature gauge is functional/stable",
  "objectIds": [38, 92],
  "defectCodes": ["OBS05", "OBS07"]
}

Response:
{
  "success": true,
  "data": {
    "id": 57,
    "actionTypeId": 3,
    "act": "11 - Anomalie",
    "responseType": "14 - Anomalie",
    "description": "Check if temperature gauge is functional/stable",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

## 🔄 Integration Points

### 1. Object Management
- **Object Linking**: Action references linked to specific objects
- **Object Attributes**: Actions use object technical specifications
- **Location Context**: Actions executed in object locations

### 2. Checklist Management
- **Checklist Creation**: Action references populate checklist options
- **Operation Integration**: Actions grouped into operations
- **Execution Sequence**: Actions ordered by execution sequence

### 3. Anomaly Management
- **Defect Association**: Anomalies linked to defect codes
- **Response Tracking**: Action responses tracked for anomalies
- **Resolution Process**: Anomalies resolved through action execution

### 4. Mobile Application
- **Action Display**: Mobile app shows action details
- **Response Capture**: Mobile app captures action responses
- **Defect Reporting**: Mobile app reports defects using codes

## 📈 Performance Considerations

### 1. Data Optimization
- **Reference Caching**: Frequently used action references cached
- **Lazy Loading**: Action details loaded on demand
- **Pagination**: Large reference lists paginated
- **Indexing**: Database indexes on search fields

### 2. Search Performance
- **Filter Optimization**: Efficient filter query execution
- **Result Caching**: Search results cached temporarily
- **Async Operations**: Non-blocking search operations
- **Database Optimization**: Optimized queries for complex filters

### 3. Mobile Performance
- **Offline Support**: Action references available offline
- **Data Synchronization**: Efficient sync of action data
- **Response Validation**: Client-side validation for responses
- **Media Optimization**: Optimized media for mobile display

## 🧪 Testing Strategy

### 1. Unit Tests
- **Action Type CRUD**: Test action type management
- **Action Reference CRUD**: Test action reference management
- **Search Logic**: Test search and filtering functionality
- **Validation**: Test input validation and error handling

### 2. Integration Tests
- **API Endpoints**: Test all action management APIs
- **Database Integration**: Test database operations
- **Object Integration**: Test object-action linking
- **Checklist Integration**: Test checklist-action integration

### 3. User Acceptance Tests
- **Action Creation**: Test complete action creation workflow
- **Reference Management**: Test action reference management
- **Search Functionality**: Test search and filter capabilities
- **Mobile Integration**: Test mobile action execution

## 🚀 Future Enhancements

### 1. Advanced Features
- **Action Templates**: Predefined action templates for common procedures
- **Action Dependencies**: Define action execution dependencies
- **Conditional Actions**: Actions based on previous results
- **Action Analytics**: Track action performance and effectiveness

### 2. Integration Improvements
- **AI Integration**: AI-powered action recommendations
- **IoT Integration**: Connect actions with IoT sensors
- **Predictive Actions**: Predictive maintenance actions
- **Workflow Automation**: Automated action workflows

### 3. User Experience
- **Visual Action Builder**: Drag-and-drop action creation
- **Action Simulation**: Simulate action execution
- **Mobile Optimization**: Enhanced mobile action interface
- **Offline Support**: Complete offline action management

## 📚 Related Documentation

- [Objects Management](./OBJECTS_MANAGEMENT.md)
- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [Anomaly Management](./ANOMALY_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook Action Types and References system, including implementation details, use cases, and integration points. For technical implementation details, refer to the source code and API documentation.*
