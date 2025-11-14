# Events Management - SmartLogBook

## 📋 Overview

The Events Management system in SmartLogBook defines and manages the various events that trigger locomotive inspections and checklist executions. It provides a structured approach to event-driven inspection procedures, distinguishing between different types of operations and locomotive configurations.

## 🎯 Objectives

- **Event Definition**: Define standardized events that trigger inspections
- **Checklist Triggering**: Link events to specific checklists
- **Operational Context**: Provide context for inspection timing and purpose
- **Locomotive Configuration**: Support different locomotive configurations (US/UM)
- **Workflow Management**: Enable event-driven inspection workflows
- **Compliance Tracking**: Ensure proper inspection procedures are followed

## 🏗️ Architecture

### Event System Structure
```
Events (Triggering Conditions)
├── PC (Préparation Courante) - Preparation
├── RS (Remise en Service) - Return to Service
├── VAR (Visite à l'Arrivée) - Arrival Inspection
└── MES (Mise en Stationnement) - Parking

Locomotive Configurations
├── US (Unité Simple) - Single Unit
└── UM (Unité Multiple) - Multiple Units
```

### Event-Checklist Relationship
```
Event → Checklist Selection → Execution → Results
```

## 🔧 Implementation Details

### 1. Event Types

#### Predefined Event Types
The system includes 4 main event types that trigger different inspection procedures:

```typescript
enum EventType {
  PC = 'PC',    // Préparation Courante (Preparation)
  RS = 'RS',    // Remise en Service (Return to Service)
  VAR = 'VAR',  // Visite à l'Arrivée (Arrival Inspection)
  MES = 'MES'   // Mise en Stationnement (Parking)
}
```

#### Event Structure
```typescript
interface Event {
  id: number;                    // Unique event identifier
  type: EventType;              // Event type (PC, RS, VAR, MES)
  name: string;                 // Event name with details
  description: string;           // Detailed event description
  locomotiveConfig: LocomotiveConfig; // US or UM configuration
  isActive: boolean;            // Event active status
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Event Details
1. **PC (Préparation Courante)**
   - **Purpose**: Preparation before locomotive departure
   - **Timing**: Before starting a locomotive
   - **Context**: Pre-departure inspection
   - **Configurations**: PC US, PC UM

2. **RS (Remise en Service)**
   - **Purpose**: Return to service after maintenance
   - **Timing**: After maintenance completion
   - **Context**: Post-maintenance inspection
   - **Configurations**: RS US, RS UM

3. **VAR (Visite à l'Arrivée)**
   - **Purpose**: Arrival inspection
   - **Timing**: Upon locomotive arrival
   - **Context**: Post-journey inspection
   - **Configurations**: VAR US, VAR UM

4. **MES (Mise en Stationnement)**
   - **Purpose**: Parking preparation
   - **Timing**: Before parking locomotive
   - **Context**: Pre-parking inspection
   - **Configurations**: MES US, MES UM

### 2. Locomotive Configuration

#### Configuration Types
```typescript
enum LocomotiveConfig {
  US = 'US',    // Unité Simple (Single Unit)
  UM = 'UM'     // Unité Multiple (Multiple Units)
}
```

#### Configuration Impact
- **US (Unité Simple)**: Single locomotive unit inspection
- **UM (Unité Multiple)**: Multiple locomotive units inspection
- **Checklist Differences**: Different checklists for US vs UM
- **Inspection Scope**: UM requires more comprehensive inspection

### 3. Event-Checklist Integration

#### Event-Checklist Mapping
```typescript
interface EventChecklistMapping {
  eventId: number;              // Event identifier
  checklistId: number;          // Checklist identifier
  locomotiveConfig: LocomotiveConfig; // US or UM
  isDefault: boolean;           // Default checklist for event
  priority: number;             // Execution priority
}
```

#### Checklist Selection Logic
1. **Event Triggered**: User selects event type
2. **Configuration Check**: Determine US or UM
3. **Checklist Selection**: Select appropriate checklist
4. **Execution**: Execute checklist with event context
5. **Results**: Record results with event information

### 4. Event Context Management

#### Event Context
```typescript
interface EventContext {
  eventId: number;              // Event identifier
  locomotiveId: number;         // Locomotive identifier
  conductorId: number;          // Conductor identifier
  timestamp: string;            // Event timestamp
  location: string;             // Event location
  weather?: string;             // Weather conditions
  notes?: string;               // Additional notes
}
```

#### Context Usage
- **Inspection Planning**: Context influences inspection approach
- **Result Analysis**: Context helps analyze inspection results
- **Compliance Tracking**: Context ensures proper procedures
- **Audit Trail**: Context provides complete audit trail

## 📱 Use Cases

### 1. Event Configuration
**Scenario**: System administrator needs to configure events for different locomotive models.

**Steps**:
1. Navigate to Events Management page
2. Review existing events:
   - PC US, PC UM
   - RS US, RS UM
   - VAR US, VAR UM
   - MES US, MES UM
3. Verify event descriptions and configurations
4. Update descriptions if needed
5. Set active status for each event
6. Save configuration

**Expected Result**: Events properly configured and available for checklist creation.

### 2. Checklist Creation with Event Context
**Scenario**: Creating a checklist for PC (Preparation) event on UM (Multiple Units).

**Steps**:
1. Navigate to Checklist Management
2. Click "Create Checklist"
3. Select Event: "PC UM" (Préparation Courante - Unité Multiple)
4. System automatically:
   - Sets locomotive configuration to UM
   - Filters operations for UM
   - Sets inspection scope for multiple units
5. Select locomotive model and number
6. Choose operations relevant to PC UM
7. Configure action sequence
8. Save checklist

**Expected Result**: Checklist created with proper event context and UM configuration.

### 3. Mobile Event Selection
**Scenario**: Conductor selecting event to start inspection on mobile device.

**Steps**:
1. Open mobile app
2. Navigate to event selection screen
3. Choose event type: "PC" (Préparation Courante)
4. Select locomotive configuration: "UM" (Unité Multiple)
5. System displays:
   - Event: PC UM
   - Description: Preparation for multiple unit departure
   - Available checklists for PC UM
6. Select appropriate checklist
7. Begin inspection

**Expected Result**: Conductor starts inspection with proper event context.

### 4. Event-Driven Inspection Workflow
**Scenario**: Complete inspection workflow triggered by VAR (Arrival) event.

**Steps**:
1. Locomotive arrives at destination
2. Conductor selects "VAR" event
3. System determines locomotive configuration (US/UM)
4. Appropriate checklist loaded
5. Inspection executed with VAR context
6. Results recorded with event information
7. Anomalies reported if found
8. Inspection completed and validated

**Expected Result**: Complete inspection workflow executed with proper event tracking.

## 🔍 Search and Filtering

### 1. Event Search Features

#### Filter Options
```typescript
interface EventFilters {
  type?: EventType;             // Filter by event type
  locomotiveConfig?: LocomotiveConfig; // Filter by configuration
  isActive?: boolean;           // Filter by active status
  hasChecklists?: boolean;      // Filter by checklist availability
  dateRange?: DateRange;        // Filter by date range
}
```

#### Advanced Search
- **Type-based Search**: Find events by type (PC, RS, VAR, MES)
- **Configuration Search**: Filter by US or UM configuration
- **Checklist Search**: Find events with specific checklists
- **Usage Search**: Find most frequently used events

### 2. Search Implementation
```typescript
// Event search functionality
export function useEventSearch() {
  const [filters, setFilters] = useState<EventFilters>({});
  const [results, setResults] = useState<Event[]>([]);
  
  const searchEvents = useCallback(async (searchFilters: EventFilters) => {
    const queryParams = new URLSearchParams();
    
    if (searchFilters.type) queryParams.append('type', searchFilters.type);
    if (searchFilters.locomotiveConfig) {
      queryParams.append('config', searchFilters.locomotiveConfig);
    }
    if (searchFilters.isActive !== undefined) {
      queryParams.append('active', searchFilters.isActive.toString());
    }
    
    const response = await fetch(`/api/events/search?${queryParams}`);
    const data = await response.json();
    setResults(data);
  }, []);
  
  return { filters, results, searchEvents, setFilters };
}
```

## 📊 Data Management

### 1. Database Schema

#### Events Table
```sql
CREATE TABLE Events (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Type NVARCHAR(10) NOT NULL, -- PC, RS, VAR, MES
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    LocomotiveConfig NVARCHAR(10) NOT NULL, -- US or UM
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- Event type and configuration index
CREATE INDEX IX_Events_Type_Config ON Events (Type, LocomotiveConfig);
CREATE INDEX IX_Events_Active ON Events (IsActive);
```

#### Event-Checklist Mapping Table
```sql
CREATE TABLE EventChecklistMappings (
    Id INT PRIMARY KEY IDENTITY(1,1),
    EventId INT FOREIGN KEY REFERENCES Events(Id),
    ChecklistId INT FOREIGN KEY REFERENCES Checklists(Id),
    LocomotiveConfig NVARCHAR(10) NOT NULL,
    IsDefault BIT DEFAULT 0,
    Priority INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

### 2. API Endpoints

#### Event Management APIs
- `GET /api/events` - List all events with filtering
- `GET /api/events/{id}` - Get specific event details
- `POST /api/events` - Create new event
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `GET /api/events/search` - Advanced search
- `GET /api/events/{id}/checklists` - Get event checklists
- `GET /api/events/types` - Get event types
- `GET /api/events/configurations` - Get locomotive configurations

#### Request/Response Examples

#### Get Events List
```typescript
GET /api/events?type=PC&config=UM

Response:
{
  "data": [
    {
      "id": 1,
      "type": "PC",
      "name": "Préparation Courante (PC) UM",
      "description": "Preparation for multiple unit departure",
      "locomotiveConfig": "UM",
      "isActive": true,
      "checklistCount": 3,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Event
```typescript
POST /api/events
{
  "type": "PC",
  "name": "Préparation Courante (PC) US",
  "description": "Preparation for single unit departure",
  "locomotiveConfig": "US",
  "isActive": true
}

Response:
{
  "success": true,
  "data": {
    "id": 2,
    "type": "PC",
    "name": "Préparation Courante (PC) US",
    "description": "Preparation for single unit departure",
    "locomotiveConfig": "US",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

## 🔄 Integration Points

### 1. Checklist Management
- **Event-Triggered Checklists**: Checklists created for specific events
- **Configuration Context**: Checklists adapt to US/UM configuration
- **Execution Context**: Checklists executed with event context
- **Result Tracking**: Results linked to specific events

### 2. Locomotive Management
- **Configuration Detection**: Automatic US/UM detection
- **Event History**: Track events per locomotive
- **Maintenance Planning**: Events drive maintenance schedules
- **Performance Analysis**: Analyze event-based performance

### 3. Mobile Application
- **Event Selection**: Mobile app event selection interface
- **Context Display**: Event context displayed during inspection
- **Offline Support**: Events available offline
- **Synchronization**: Event data synchronized with backend

### 4. Reporting System
- **Event Analytics**: Analyze event frequency and patterns
- **Compliance Reporting**: Track event-based compliance
- **Performance Metrics**: Event-based performance metrics
- **Audit Trails**: Complete event audit trails

## 📈 Performance Considerations

### 1. Data Optimization
- **Event Caching**: Frequently used events cached
- **Configuration Indexing**: Database indexes on configurations
- **Lazy Loading**: Event details loaded on demand
- **Pagination**: Large event lists paginated

### 2. Search Performance
- **Type-based Indexing**: Efficient type-based searches
- **Configuration Filtering**: Optimized configuration filters
- **Result Caching**: Search results cached temporarily
- **Async Operations**: Non-blocking search operations

### 3. Mobile Performance
- **Offline Support**: Events available offline
- **Data Synchronization**: Efficient event data sync
- **Context Caching**: Event context cached locally
- **Progressive Loading**: Events loaded progressively

## 🧪 Testing Strategy

### 1. Unit Tests
- **Event CRUD**: Test event management operations
- **Configuration Logic**: Test US/UM configuration handling
- **Search Functionality**: Test search and filtering
- **Validation**: Test input validation and error handling

### 2. Integration Tests
- **API Endpoints**: Test all event management APIs
- **Database Integration**: Test database operations
- **Checklist Integration**: Test event-checklist linking
- **Mobile Integration**: Test mobile event handling

### 3. User Acceptance Tests
- **Event Creation**: Test complete event creation workflow
- **Event Selection**: Test event selection process
- **Checklist Integration**: Test event-checklist integration
- **Mobile Workflow**: Test mobile event workflow

## 🚀 Future Enhancements

### 1. Advanced Features
- **Event Scheduling**: Automated event scheduling
- **Event Dependencies**: Define event dependencies
- **Conditional Events**: Events based on conditions
- **Event Analytics**: Advanced event analytics

### 2. Integration Improvements
- **IoT Integration**: Connect events with IoT sensors
- **Predictive Events**: AI-powered event prediction
- **Workflow Automation**: Automated event workflows
- **Real-time Events**: Real-time event processing

### 3. User Experience
- **Visual Event Builder**: Drag-and-drop event creation
- **Event Simulation**: Simulate event scenarios
- **Mobile Optimization**: Enhanced mobile event interface
- **Offline Support**: Complete offline event management

## 📚 Related Documentation

- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [Locomotive Management](./LOCOMOTIVE_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)
- [Reporting System](./REPORTING_SYSTEM.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook Events Management system, including implementation details, use cases, and integration points. For technical implementation details, refer to the source code and API documentation.*
