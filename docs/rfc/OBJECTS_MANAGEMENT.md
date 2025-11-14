# Objects Management - SmartLogBook

## 📋 Overview

The Objects Management system in SmartLogBook provides comprehensive management of railway locomotive components and equipment. It serves as the foundation for inspection and maintenance operations by cataloging all inspectable objects with their locations, attributes, and associated media.

## 🎯 Objectives

- **Object Cataloging**: Maintain a comprehensive database of all locomotive components ✅ **IMPLEMENTED**
- **Location Tracking**: Track object locations using hierarchical location codes ✅ **IMPLEMENTED**
- **Attribute Management**: Store technical specifications and characteristics ✅ **IMPLEMENTED**
- **Media Integration**: Associate images, schematics, and documentation ✅ **IMPLEMENTED**
- **Inspection Support**: Enable efficient checklist creation and execution ✅ **IMPLEMENTED**
- **Maintenance Planning**: Support preventive and corrective maintenance ✅ **IMPLEMENTED**
- **Advanced Filtering**: Sophisticated filtering system with localStorage persistence ✅ **IMPLEMENTED**
- **File Upload**: Complete file upload system for media attachments ✅ **IMPLEMENTED**
- **CRUD Operations**: Complete create, read, update, delete functionality ✅ **IMPLEMENTED**

## 🏗️ Architecture

### Object Structure
```
Object
├── Identification (ID, Code, Name)
├── Location (Hierarchical 4-level structure)
├── Attributes (Technical specifications)
├── Media (Images, schematics, documentation)
└── Relationships (Actions, Checklists, Anomalies)
```

### Location Hierarchy
```
Level 1: Locomotive (e.g., Loc 2 (Menée))
├── Level 2: Zone (e.g., Cabine)
│   ├── Level 3: Sub-zone (e.g., Conduite Grand Bout)
│   │   └── Level 4: Specific Area (e.g., Pupitre d'activation)
```

## 🔧 Implementation Details

### 1. Object Identification

#### Core Properties
```typescript
interface Object {
  id: number;                    // Unique numeric identifier
  code: string;                  // Functional code (e.g., "VDF001")
  name: string;                  // Human-readable name
  description: string;           // Detailed description
  attributes: ObjectAttribute[]; // Technical specifications
  locations: Location[];         // Where object can be found
  media: MediaFile[];            // Associated images/documents
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Object Code Structure
- **Format**: `XXX-XXX-X-XXX` (3 digits, 3 digits, 1 letter, 3 digits)
- **Example**: `001-002-A-001` (Voyants de défaut)
- **Significance**: Each part represents different classification levels

### 2. Location Management

#### Hierarchical Location System
```typescript
interface Location {
  id: number;
  code: string;                  // Format: XX-X-XX
  name: string;                  // Full location name
  level1: string;               // Locomotive level
  level2: string;               // Zone level (Cabine, etc.)
  level3: string;               // Sub-zone level
  level4: string;               // Specific area level
  description: string;          // Detailed description
  media: MediaFile[];          // Location schematics
}
```

#### Location Code Examples
- `01-I-25`: Loc 2 (Menée) - Cabine - Conduite Grand Bout - Pupitre d'activation
- `02-A-15`: Loc 1 (Tête) - Moteur - Compartiment principal - Boîte d'essieux

### 3. Object Attributes

#### Attribute Types
```typescript
interface ObjectAttribute {
  id: number;
  name: string;                 // Attribute name
  value: string;                // Attribute value
  unit: string;                 // Measurement unit
  type: AttributeType;          // Text, Number, Boolean, List
  category: string;             // Technical category
  isRequired: boolean;          // Required for inspection
}
```

#### Common Attributes
- **Electrical**: Voltage, Current, Power rating
- **Mechanical**: Dimensions, Weight, Material
- **Operational**: Operating temperature, Pressure
- **Safety**: Safety ratings, Certifications

### 4. Media Management

#### Media Types
```typescript
interface MediaFile {
  id: number;
  filename: string;             // Original filename
  url: string;                  // File URL
  type: MediaType;              // Image, PDF, Video
  size: number;                 // File size in bytes
  mimeType: string;             // MIME type
  description: string;          // Media description
  uploadedAt: string;           // Upload timestamp
}
```

#### Supported Media Formats
- **Images**: JPEG, PNG, GIF, SVG
- **Documents**: PDF, DOC, DOCX
- **Schematics**: DWG, DXF, CAD files
- **Videos**: MP4, AVI (for complex procedures)

## 📱 Use Cases

### 1. Object Registration
**Scenario**: A new component needs to be added to the system.

**Steps**:
1. Navigate to Objects Management page
2. Click "Add Object" button
3. Fill in object details:
   - Code: `VDF002` (Voyants de défaut type 2)
   - Name: "Voyants de défaut - Cabine principale"
   - Description: "LED indicators for system status"
4. Select location from hierarchical tree
5. Add technical attributes:
   - Voltage: 24V DC
   - Current: 0.1A
   - Color: Red/Green/Yellow
6. Upload reference images
7. Save object

**Expected Result**: New object appears in the objects list with complete information.

### 2. Location-Based Object Search
**Scenario**: A technician needs to find all objects in a specific location.

**Steps**:
1. Access Objects Management page
2. Use location filter
3. Select location hierarchy:
   - Level 1: Loc 2 (Menée)
   - Level 2: Cabine
   - Level 3: Conduite Grand Bout
4. Apply filter
5. Review filtered object list

**Expected Result**: Only objects in the selected location are displayed.

### 3. Object Inspection Preparation
**Scenario**: Preparing a checklist for a specific locomotive.

**Steps**:
1. Select locomotive model and number
2. System automatically filters objects by location
3. Review object list with attributes
4. Check associated media for reference
5. Identify objects requiring inspection
6. Create inspection checklist

**Expected Result**: Comprehensive checklist with all relevant objects.

### 4. Object Maintenance History
**Scenario**: Tracking maintenance history for a specific object.

**Steps**:
1. Search for object by code or name
2. View object details page
3. Access maintenance history tab
4. Review past inspections and repairs
5. Check associated anomalies
6. Plan future maintenance

**Expected Result**: Complete maintenance history and planning information.

## 🔍 Search and Filtering

### 1. Advanced Search Filters

#### Filter Options
```typescript
interface ObjectFilters {
  code?: string;                // Object code filter
  name?: string;                // Object name filter
  location?: LocationFilter;    // Location hierarchy filter
  attributes?: AttributeFilter; // Attribute-based filter
  media?: boolean;              // Objects with/without media
  status?: ObjectStatus;        // Active/Inactive status
}
```

#### Location Filter
- **Level 1**: Locomotive selection
- **Level 2**: Zone selection (Cabine, Moteur, etc.)
- **Level 3**: Sub-zone selection
- **Level 4**: Specific area selection
- **Multi-level**: Filter by any combination of levels

### 2. Search Implementation
```typescript
// Advanced search functionality
export function useObjectSearch() {
  const [filters, setFilters] = useState<ObjectFilters>({});
  const [results, setResults] = useState<Object[]>([]);
  
  const searchObjects = useCallback(async (searchFilters: ObjectFilters) => {
    const queryParams = new URLSearchParams();
    
    if (searchFilters.code) queryParams.append('code', searchFilters.code);
    if (searchFilters.name) queryParams.append('name', searchFilters.name);
    if (searchFilters.location) {
      queryParams.append('location', JSON.stringify(searchFilters.location));
    }
    
    const response = await fetch(`/api/objects/search?${queryParams}`);
    const data = await response.json();
    setResults(data);
  }, []);
  
  return { filters, results, searchObjects, setFilters };
}
```

## 📊 Data Management

### 1. Object Data Structure

#### Database Schema
```sql
-- Objects table
CREATE TABLE Objects (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- Object Locations junction table
CREATE TABLE ObjectLocations (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ObjectId INT FOREIGN KEY REFERENCES Objects(Id),
    LocationId INT FOREIGN KEY REFERENCES Locations(Id),
    IsPrimary BIT DEFAULT 0
);

-- Object Attributes table
CREATE TABLE ObjectAttributes (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ObjectId INT FOREIGN KEY REFERENCES Objects(Id),
    Name NVARCHAR(100) NOT NULL,
    Value NVARCHAR(500),
    Unit NVARCHAR(20),
    Type NVARCHAR(20),
    Category NVARCHAR(50),
    IsRequired BIT DEFAULT 0
);
```

### 2. API Endpoints

#### Object Management APIs ✅ **IMPLEMENTED**
- `GET /api/objects` - List all objects with filtering
- `GET /api/objects/{id}` - Get specific object details
- `POST /api/objects` - Create new object
- `PUT /api/objects/{id}` - Update object
- `DELETE /api/objects/{id}` - Delete object
- `GET /api/objects/filters` - Get available filters ✅ **NEW**
- `GET /api/objects/search` - Advanced search
- `GET /api/objects/{id}/locations` - Get object locations
- `GET /api/objects/{id}/attributes` - Get object attributes
- `GET /api/objects/{id}/media` - Get object media files

#### Request/Response Examples

#### Get Objects List
```typescript
GET /api/objects?page=1&limit=20&location=01-I-25

Response:
{
  "data": [
    {
      "id": 1,
      "code": "VDF001",
      "name": "Voyants de défaut",
      "description": "LED indicators for system status",
      "locations": [
        {
          "id": 25,
          "code": "01-I-25",
          "name": "Pupitre d'activation"
        }
      ],
      "attributes": [
        {
          "name": "Voltage",
          "value": "24",
          "unit": "V DC"
        }
      ],
      "mediaCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Create Object
```typescript
POST /api/objects
{
  "code": "VDF002",
  "name": "Voyants de défaut - Type 2",
  "description": "Enhanced LED indicators with diagnostics",
  "locationIds": [25, 26],
  "attributes": [
    {
      "name": "Voltage",
      "value": "24",
      "unit": "V DC",
      "type": "number",
      "category": "electrical",
      "isRequired": true
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "id": 2,
    "code": "VDF002",
    "name": "Voyants de défaut - Type 2",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

## 🔄 Integration Points

### 1. Action References
- **Action Linking**: Objects linked to specific actions
- **Inspection Procedures**: Objects define what actions are possible
- **Response Types**: Objects determine expected response formats

### 2. Checklist Management
- **Checklist Creation**: Objects populate checklist options
- **Location Filtering**: Objects filtered by locomotive location
- **Inspection Sequence**: Objects ordered by inspection sequence

### 3. Anomaly Tracking
- **Anomaly Association**: Anomalies linked to specific objects
- **Location Context**: Anomalies include object location information
- **Maintenance Planning**: Objects drive maintenance schedules

### 4. Mobile Application
- **Object Display**: Mobile app shows object details
- **Media Access**: Mobile users access object media
- **Location Navigation**: Mobile app uses object locations

## 📈 Performance Considerations

### 1. Data Optimization
- **Pagination**: Large object lists paginated
- **Lazy Loading**: Object details loaded on demand
- **Caching**: Frequently accessed objects cached
- **Indexing**: Database indexes on search fields

### 2. Search Performance
- **Full-Text Search**: Database full-text search capabilities
- **Filter Optimization**: Efficient filter query execution
- **Result Caching**: Search results cached temporarily
- **Async Loading**: Non-blocking search operations

### 3. Media Handling
- **Image Optimization**: Automatic image compression
- **CDN Integration**: Media files served via CDN
- **Progressive Loading**: Images loaded progressively
- **Format Optimization**: Appropriate formats for different uses

## 🧪 Testing Strategy

### 1. Unit Tests
- **Object CRUD**: Test create, read, update, delete operations
- **Search Logic**: Test search and filtering functionality
- **Validation**: Test input validation and error handling
- **Data Transformation**: Test data format conversions

### 2. Integration Tests
- **API Endpoints**: Test all object management APIs
- **Database Integration**: Test database operations
- **Media Upload**: Test file upload functionality
- **Location Integration**: Test location hierarchy handling

### 3. User Acceptance Tests
- **Object Creation**: Test complete object creation workflow
- **Search Functionality**: Test search and filter capabilities
- **Media Management**: Test media upload and display
- **Location Navigation**: Test location-based object access

## 🚀 Future Enhancements

### 1. Advanced Features
- **Object Relationships**: Define relationships between objects
- **Version Control**: Track object specification changes
- **Bulk Operations**: Bulk import/export of objects
- **Template System**: Object templates for common components

### 2. Integration Improvements
- **ERP Integration**: Connect with enterprise resource planning
- **CAD Integration**: Import CAD drawings and specifications
- **IoT Integration**: Connect with IoT sensors on objects
- **Predictive Maintenance**: AI-powered maintenance predictions

### 3. User Experience
- **Visual Object Browser**: 3D visualization of locomotive objects
- **Interactive Schematics**: Clickable technical drawings
- **Mobile Optimization**: Enhanced mobile object management
- **Offline Support**: Offline object data access

## 📚 Related Documentation

- [Location Management](./LOCATION_MANAGEMENT.md)
- [Action References](./ACTION_REFERENCES.md)
- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook Objects Management system, including implementation details, use cases, and integration points. For technical implementation details, refer to the source code and API documentation.*
