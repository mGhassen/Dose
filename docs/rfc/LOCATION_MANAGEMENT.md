# Location Management - SmartLogBook

## 📋 Overview

The Location Management system in SmartLogBook provides a hierarchical structure for organizing and managing locomotive locations. It enables precise object positioning and facilitates efficient navigation during inspections by providing a 4-level hierarchical location system that covers the entire locomotive structure.

## 🎯 Objectives

- **Hierarchical Organization**: Provide a structured 4-level location hierarchy
- **Precise Positioning**: Enable exact object location identification
- **Navigation Support**: Facilitate efficient inspection navigation
- **Media Integration**: Associate location schematics and documentation
- **Mobile Integration**: Support mobile app location-based navigation
- **Maintenance Planning**: Enable location-based maintenance scheduling

## 🏗️ Architecture

### Location Hierarchy Structure
```
Level 1: Locomotive (e.g., Loc 2 (Menée))
├── Level 2: Zone (e.g., Cabine)
│   ├── Level 3: Sub-zone (e.g., Conduite Grand Bout)
│   │   └── Level 4: Specific Area (e.g., Pupitre d'activation)
```

### Location Code Format
- **Format**: `XX-X-XX` (2 digits, 1 letter, 2 digits)
- **Example**: `01-I-25` (Loc 2 - Cabine - Conduite Grand Bout - Pupitre d'activation)
- **Significance**: Each part represents different hierarchy levels

## 🔧 Implementation Details

### 1. Location Structure

#### Location Entity
```typescript
interface Location {
  id: number;                    // Unique location identifier
  name: string;                  // Full location name
  code: string;                  // Location code (XX-X-XX format)
  level1: string;               // Level 1: Locomotive
  level2: string;               // Level 2: Zone
  level3: string;               // Level 3: Sub-zone
  level4: string;               // Level 4: Specific area
  description: string;          // Detailed location description
  media: MediaFile[];           // Associated schematics/images
  parentId?: number;            // Parent location ID
  children: Location[];        // Child locations
  createdAt: string;           // Creation timestamp
  updatedAt: string;           // Last modification timestamp
}
```

#### Location Levels
1. **Level 1 - Locomotive**: Top-level locomotive identification
   - Examples: "Loc 2 (Menée)", "Loc 1 (Tête)"
   - Purpose: Identifies which locomotive unit

2. **Level 2 - Zone**: Major functional areas
   - Examples: "Cabine", "Moteur", "Compartiment principal"
   - Purpose: Identifies major functional zones

3. **Level 3 - Sub-zone**: Specific areas within zones
   - Examples: "Conduite Grand Bout", "Conduite Petit Bout", "Panneau climatisation"
   - Purpose: Identifies specific work areas

4. **Level 4 - Specific Area**: Precise locations within sub-zones
   - Examples: "Pupitre d'activation", "Webasto-Climatisation", "Panneau contrôle"
   - Purpose: Identifies exact object locations

### 2. Location Code System

#### Code Structure
```typescript
interface LocationCode {
  level1Code: string;           // 2 digits (01, 02, etc.)
  level2Code: string;           // 1 letter (I, A, B, etc.)
  level3Code: string;           // 2 digits (25, 15, etc.)
  fullCode: string;            // Combined: "01-I-25"
}
```

#### Code Examples
- `01-I-25`: Loc 2 (Menée) - Cabine - Conduite Grand Bout - Pupitre d'activation
- `02-A-15`: Loc 1 (Tête) - Moteur - Compartiment principal - Boîte d'essieux
- `01-I-26`: Loc 2 (Menée) - Cabine - Conduite Petit Bout - Panneau climatisation

### 3. Hierarchical Navigation

#### Navigation Structure
```typescript
interface LocationNavigation {
  currentLevel: number;         // Current navigation level (1-4)
  selectedPath: string[];       // Selected location path
  availableOptions: Location[]; // Available options at current level
  breadcrumb: BreadcrumbItem[]; // Navigation breadcrumb
}
```

#### Navigation Flow
1. **Level 1 Selection**: Choose locomotive unit
2. **Level 2 Selection**: Choose functional zone
3. **Level 3 Selection**: Choose sub-zone
4. **Level 4 Selection**: Choose specific area
5. **Object Display**: Show objects at selected location

### 4. Media Integration

#### Location Media
```typescript
interface LocationMedia {
  id: number;
  locationId: number;
  filename: string;             // Media filename
  url: string;                  // Media URL
  type: MediaType;              // Image, PDF, Video, CAD
  description: string;          // Media description
  isPrimary: boolean;          // Primary location image
  uploadedAt: string;          // Upload timestamp
}
```

#### Media Types
- **Schematics**: Technical drawings and diagrams
- **Photos**: Actual location images
- **Videos**: Location walkthrough videos
- **CAD Files**: 3D models and technical drawings
- **Documentation**: Location-specific documentation

## 📱 Use Cases

### 1. Location Creation
**Scenario**: Adding a new location for a newly installed component.

**Steps**:
1. Navigate to Location Management page
2. Click "Add Location" button
3. Fill in location details:
   - Level 1: Select "Loc 2 (Menée)"
   - Level 2: Select "Cabine"
   - Level 3: Enter "Conduite Grand Bout"
   - Level 4: Enter "Nouveau Panneau"
4. Set location code: `01-I-27`
5. Add description: "New control panel in main cab"
6. Upload location schematic
7. Save location

**Expected Result**: New location appears in hierarchy and is available for object assignment.

### 2. Hierarchical Navigation
**Scenario**: Technician needs to navigate to a specific location for inspection.

**Steps**:
1. Open mobile app
2. Select "Location Mode" navigation
3. Navigate hierarchy:
   - Level 1: Select "Loc 2 (Menée)"
   - Level 2: Select "Cabine"
   - Level 3: Select "Conduite Grand Bout"
   - Level 4: Select "Pupitre d'activation"
4. View location details and schematic
5. Access objects at this location
6. Begin inspection

**Expected Result**: Technician efficiently navigates to exact location and can access relevant objects.

### 3. Object Location Assignment
**Scenario**: Assigning a new object to multiple locations.

**Steps**:
1. Create new object: "Temperature Sensor"
2. Navigate to object location assignment
3. Select multiple locations:
   - `01-I-25` (Pupitre d'activation)
   - `01-I-26` (Panneau climatisation)
   - `02-A-15` (Boîte d'essieux)
4. Set primary location: `01-I-25`
5. Save assignments

**Expected Result**: Object appears in all selected locations with primary location marked.

### 4. Location-Based Checklist Filtering
**Scenario**: Creating a checklist for a specific locomotive location.

**Steps**:
1. Create new checklist
2. Select locomotive: "Loc 2 (Menée)"
3. Choose location filter: "Cabine - Conduite Grand Bout"
4. System automatically filters:
   - Objects in selected location
   - Actions applicable to those objects
   - Relevant action references
5. Review filtered checklist options
6. Create location-specific checklist

**Expected Result**: Checklist contains only actions relevant to the selected location.

## 🔍 Search and Filtering

### 1. Location Search Features

#### Search Options
```typescript
interface LocationFilters {
  level1?: string;              // Filter by locomotive
  level2?: string;              // Filter by zone
  level3?: string;              // Filter by sub-zone
  level4?: string;              // Filter by specific area
  code?: string;                // Filter by location code
  hasMedia?: boolean;           // Filter by media presence
  hasObjects?: boolean;         // Filter by object presence
}
```

#### Advanced Search
- **Hierarchical Search**: Search within specific hierarchy levels
- **Code-based Search**: Search by location code patterns
- **Object-based Search**: Find locations containing specific objects
- **Media-based Search**: Find locations with specific media types

### 2. Search Implementation
```typescript
// Location search functionality
export function useLocationSearch() {
  const [filters, setFilters] = useState<LocationFilters>({});
  const [results, setResults] = useState<Location[]>([]);
  
  const searchLocations = useCallback(async (searchFilters: LocationFilters) => {
    const queryParams = new URLSearchParams();
    
    if (searchFilters.level1) queryParams.append('level1', searchFilters.level1);
    if (searchFilters.level2) queryParams.append('level2', searchFilters.level2);
    if (searchFilters.code) queryParams.append('code', searchFilters.code);
    if (searchFilters.hasObjects) queryParams.append('hasObjects', 'true');
    
    const response = await fetch(`/api/localizations/search?${queryParams}`);
    const data = await response.json();
    setResults(data);
  }, []);
  
  return { filters, results, searchLocations, setFilters };
}
```

## 📊 Data Management

### 1. Database Schema

#### Locations Table
```sql
CREATE TABLE Locations (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(200) NOT NULL,
    Code NVARCHAR(20) NOT NULL UNIQUE,
    Level1 NVARCHAR(100),
    Level2 NVARCHAR(100),
    Level3 NVARCHAR(100),
    Level4 NVARCHAR(100),
    Description NVARCHAR(1000),
    ParentId INT FOREIGN KEY REFERENCES Locations(Id),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- Location hierarchy index
CREATE INDEX IX_Locations_Hierarchy ON Locations (Level1, Level2, Level3, Level4);
CREATE INDEX IX_Locations_Code ON Locations (Code);
CREATE INDEX IX_Locations_ParentId ON Locations (ParentId);
```

#### Location Media Table
```sql
CREATE TABLE LocationMedia (
    Id INT PRIMARY KEY IDENTITY(1,1),
    LocationId INT FOREIGN KEY REFERENCES Locations(Id),
    Filename NVARCHAR(200) NOT NULL,
    Url NVARCHAR(500) NOT NULL,
    Type NVARCHAR(50),
    Description NVARCHAR(500),
    IsPrimary BIT DEFAULT 0,
    UploadedAt DATETIME2 DEFAULT GETDATE()
);
```

### 2. API Endpoints

#### Location Management APIs
- `GET /api/localizations` - List all locations with filtering
- `GET /api/localizations/{id}` - Get specific location details
- `POST /api/localizations` - Create new location
- `PUT /api/localizations/{id}` - Update location
- `DELETE /api/localizations/{id}` - Delete location
- `GET /api/localizations/search` - Advanced search
- `GET /api/localizations/hierarchy` - Get location hierarchy
- `GET /api/localizations/{id}/objects` - Get objects at location
- `GET /api/localizations/{id}/media` - Get location media

#### Request/Response Examples

#### Get Location Hierarchy
```typescript
GET /api/localizations/hierarchy?level1=Loc 2 (Menée)

Response:
{
  "data": [
    {
      "id": 25,
      "name": "Pupitre d'activation",
      "code": "01-I-25",
      "level1": "Loc 2 (Menée)",
      "level2": "Cabine",
      "level3": "Conduite Grand Bout",
      "level4": "Pupitre d'activation",
      "description": "Main control panel in driver's cab",
      "children": [],
      "objectCount": 5,
      "hasMedia": true
    },
    {
      "id": 26,
      "name": "Panneau climatisation",
      "code": "01-I-26",
      "level1": "Loc 2 (Menée)",
      "level2": "Cabine",
      "level3": "Conduite Petit Bout",
      "level4": "Panneau climatisation",
      "description": "Climate control panel",
      "children": [],
      "objectCount": 3,
      "hasMedia": true
    }
  ]
}
```

#### Create Location
```typescript
POST /api/localizations
{
  "name": "Nouveau Panneau",
  "code": "01-I-27",
  "level1": "Loc 2 (Menée)",
  "level2": "Cabine",
  "level3": "Conduite Grand Bout",
  "level4": "Nouveau Panneau",
  "description": "New control panel installation",
  "parentId": 25
}

Response:
{
  "success": true,
  "data": {
    "id": 27,
    "name": "Nouveau Panneau",
    "code": "01-I-27",
    "level1": "Loc 2 (Menée)",
    "level2": "Cabine",
    "level3": "Conduite Grand Bout",
    "level4": "Nouveau Panneau",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

## 🔄 Integration Points

### 1. Object Management
- **Object Location**: Objects assigned to specific locations
- **Location Context**: Objects inherit location context
- **Hierarchical Filtering**: Objects filtered by location hierarchy

### 2. Action References
- **Location-specific Actions**: Actions executed at specific locations
- **Location Context**: Actions include location information
- **Navigation Support**: Actions guide users to correct locations

### 3. Checklist Management
- **Location-based Checklists**: Checklists created for specific locations
- **Navigation Sequence**: Checklists ordered by location proximity
- **Location Validation**: Actions validated against object locations

### 4. Mobile Application
- **Location Navigation**: Mobile app uses location hierarchy
- **GPS Integration**: Location-based GPS navigation
- **Offline Maps**: Location schematics available offline
- **Location Tracking**: Track user location during inspections

## 📈 Performance Considerations

### 1. Data Optimization
- **Hierarchical Indexing**: Database indexes on hierarchy levels
- **Location Caching**: Frequently accessed locations cached
- **Lazy Loading**: Location details loaded on demand
- **Pagination**: Large location lists paginated

### 2. Navigation Performance
- **Tree Structure**: Efficient tree data structure for navigation
- **Path Caching**: Frequently used paths cached
- **Async Loading**: Non-blocking location loading
- **Progressive Loading**: Load locations progressively

### 3. Media Handling
- **Image Optimization**: Automatic image compression
- **CDN Integration**: Media files served via CDN
- **Progressive Loading**: Images loaded progressively
- **Format Optimization**: Appropriate formats for different uses

## 🧪 Testing Strategy

### 1. Unit Tests
- **Location CRUD**: Test location management operations
- **Hierarchy Logic**: Test hierarchical relationships
- **Search Functionality**: Test search and filtering
- **Validation**: Test input validation and error handling

### 2. Integration Tests
- **API Endpoints**: Test all location management APIs
- **Database Integration**: Test database operations
- **Object Integration**: Test object-location linking
- **Media Integration**: Test media upload and display

### 3. User Acceptance Tests
- **Location Creation**: Test complete location creation workflow
- **Hierarchical Navigation**: Test navigation through hierarchy
- **Search Functionality**: Test search and filter capabilities
- **Mobile Integration**: Test mobile location navigation

## 🚀 Future Enhancements

### 1. Advanced Features
- **3D Visualization**: 3D location visualization
- **AR Integration**: Augmented reality location navigation
- **Location Analytics**: Track location usage and performance
- **Smart Navigation**: AI-powered navigation suggestions

### 2. Integration Improvements
- **GPS Integration**: Real-time GPS location tracking
- **IoT Integration**: Connect with location-based sensors
- **Predictive Navigation**: Predict optimal inspection routes
- **Workflow Automation**: Automated location-based workflows

### 3. User Experience
- **Visual Location Builder**: Drag-and-drop location creation
- **Interactive Maps**: Interactive location maps
- **Mobile Optimization**: Enhanced mobile location interface
- **Offline Support**: Complete offline location management

## 📚 Related Documentation

- [Objects Management](./OBJECTS_MANAGEMENT.md)
- [Action References](./ACTION_TYPES_AND_REFERENCES.md)
- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook Location Management system, including implementation details, use cases, and integration points. For technical implementation details, refer to the source code and API documentation.*
