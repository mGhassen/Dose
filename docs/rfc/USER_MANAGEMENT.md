# User Management - SmartLogBook

## 📋 Overview

The User Management system in SmartLogBook provides comprehensive management of application users, including conductors, managers, and administrators. It integrates with Microsoft Azure AD B2C for authentication while maintaining application-specific user profiles, roles, and permissions.

## 🎯 Objectives

- **User Registration**: Manage user account creation and registration
- **Role Management**: Assign and manage user roles (Conductor, Manager, Administrator)
- **Department Organization**: Organize users by departments
- **Account Lifecycle**: Handle user account status and approval workflows
- **Active Directory Integration**: Synchronize with Microsoft AD B2C
- **Access Control**: Implement role-based access control

## 🏗️ Architecture

### User Management Structure
```
User Management
├── User Profiles (Personal Information)
├── Role Assignment (Conductor, Manager, Administrator)
├── Department Organization (Department Assignment)
├── Account Status (Active, Pending, Disabled)
├── Active Directory Sync (Microsoft AD B2C)
└── Access Control (Role-based Permissions)
```

### User Roles Hierarchy
```
Administrator (Full Access)
├── User Management
├── System Configuration
├── All Features Access
└── Audit and Reporting

Manager (Supervisory Access)
├── Checklist Supervision
├── User Management (Limited)
├── Reporting and Analytics
└── Parameter Configuration

Conductor (Operational Access)
├── Mobile App Access
├── Checklist Execution
├── Anomaly Reporting
└── Basic Data Entry
```

## 🔧 Implementation Details

### 1. User Profile Structure

#### User Entity
```typescript
interface User {
  id: number;                    // Unique user identifier
  microsoftId: string;          // Microsoft AD B2C identifier
  email: string;                 // Europorte email address
  firstName: string;             // User first name
  lastName: string;              // User last name
  phoneNumber: string;           // User phone number
  role: UserRole;               // User role
  department: string;            // Department assignment
  status: AccountStatus;        // Account status
  isActive: boolean;            // Active status
  lastLoginAt?: string;         // Last login timestamp
  createdAt: string;            // Account creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### User Roles
```typescript
enum UserRole {
  CONDUCTOR = 'conductor',       // Mobile app users
  MANAGER = 'manager',          // Supervisory users
  ADMINISTRATOR = 'administrator' // Full access users
}
```

#### Account Status
```typescript
enum AccountStatus {
  PENDING = 'pending',          // Awaiting approval
  ACTIVE = 'active',            // Active account
  DISABLED = 'disabled',        // Disabled account
  SUSPENDED = 'suspended'       // Suspended account
}
```

### 2. Active Directory Integration

#### Microsoft AD B2C Sync
```typescript
interface ADUserData {
  microsoftId: string;          // SID from Microsoft AD
  email: string;                // Europorte email
  firstName: string;            // First name from AD
  lastName: string;             // Last name from AD
  phoneNumber: string;          // Phone number from AD
  department: string;           // Department from AD
  jobTitle: string;             // Job title from AD
  manager: string;              // Manager information
}
```

#### Sync Process
1. **User Creation**: User authenticates with Microsoft AD B2C
2. **Data Extraction**: Extract user data from Active Directory
3. **Profile Creation**: Create application user profile
4. **Role Assignment**: Administrator assigns appropriate role
5. **Account Activation**: Manager approves account activation
6. **Ongoing Sync**: Regular synchronization with AD

### 3. Role-Based Access Control

#### Permission System
```typescript
interface Permission {
  resource: string;              // Resource name
  action: string;                // Action (read, write, delete)
  allowed: boolean;             // Permission allowed
}

interface RolePermissions {
  role: UserRole;               // User role
  permissions: Permission[];     // Role permissions
}
```

#### Role Permissions
- **Conductor**: Mobile app access, checklist execution, anomaly reporting
- **Manager**: Web access, user management (limited), reporting, configuration
- **Administrator**: Full access, user management, system configuration, audit

### 4. Department Management

#### Department Structure
```typescript
interface Department {
  id: number;                    // Department identifier
  name: string;                 // Department name
  description: string;          // Department description
  managerId?: number;          // Department manager
  isActive: boolean;            // Active status
  userCount: number;            // Number of users
  createdAt: string;            // Creation timestamp
  updatedAt: string;            // Last modification timestamp
}
```

#### Common Departments
- **Operations**: Conductor operations
- **Maintenance**: Maintenance personnel
- **Management**: Supervisory staff
- **Administration**: Administrative staff

## 📱 Use Cases

### 1. User Registration
**Scenario**: Adding a new conductor to the system.

**Steps**:
1. Administrator navigates to User Management
2. Clicks "Add User" button
3. User authenticates with Microsoft AD B2C:
   - Enters Europorte email
   - Microsoft AD B2C popup opens
   - User enters credentials
4. System automatically populates:
   - First name, last name from AD
   - Phone number from AD
   - Department from AD
5. Administrator assigns role: "Conductor"
6. Account status set to "Pending Approval"
7. Manager receives notification for approval
8. Manager approves account
9. User receives notification and can access mobile app

**Expected Result**: New conductor account created and activated.

### 2. Role Management
**Scenario**: Changing a user's role from Conductor to Manager.

**Steps**:
1. Administrator accesses User Management
2. Selects user to modify
3. Changes role from "Conductor" to "Manager"
4. System updates permissions:
   - Removes mobile app access
   - Adds web access
   - Adds management permissions
5. User receives notification of role change
6. User must re-login to access new permissions

**Expected Result**: User role updated with appropriate permissions.

### 3. Account Status Management
**Scenario**: Temporarily disabling a user account.

**Steps**:
1. Administrator accesses User Management
2. Selects user account
3. Changes status from "Active" to "Disabled"
4. System immediately:
   - Revokes access tokens
   - Logs out user from all sessions
   - Sends notification to user
5. User loses access to application
6. Administrator can reactivate account when needed

**Expected Result**: User account disabled and access revoked.

### 4. Department Organization
**Scenario**: Organizing users by department for better management.

**Steps**:
1. Administrator creates departments:
   - Operations
   - Maintenance
   - Management
2. Assigns users to departments
3. Sets department managers
4. Configures department-specific permissions
5. Generates department reports
6. Tracks department performance

**Expected Result**: Users organized by department with appropriate management structure.

## 🔍 Search and Filtering

### 1. User Search Features

#### Filter Options
```typescript
interface UserFilters {
  name?: string;                 // Filter by name
  email?: string;               // Filter by email
  role?: UserRole;              // Filter by role
  department?: string;          // Filter by department
  status?: AccountStatus;       // Filter by status
  isActive?: boolean;          // Filter by active status
  lastLoginRange?: DateRange;   // Filter by last login
}
```

#### Advanced Search
- **Name-based Search**: Find users by name patterns
- **Role-based Search**: Filter by user roles
- **Department Search**: Filter by departments
- **Status Search**: Filter by account status

### 2. Search Implementation
```typescript
// User search functionality
export function useUserSearch() {
  const [filters, setFilters] = useState<UserFilters>({});
  const [results, setResults] = useState<User[]>([]);
  
  const searchUsers = useCallback(async (searchFilters: UserFilters) => {
    const queryParams = new URLSearchParams();
    
    if (searchFilters.name) queryParams.append('name', searchFilters.name);
    if (searchFilters.role) queryParams.append('role', searchFilters.role);
    if (searchFilters.department) queryParams.append('department', searchFilters.department);
    if (searchFilters.status) queryParams.append('status', searchFilters.status);
    
    const response = await fetch(`/api/users/search?${queryParams}`);
    const data = await response.json();
    setResults(data);
  }, []);
  
  return { filters, results, searchUsers, setFilters };
}
```

## 📊 Data Management

### 1. Database Schema

#### Users Table
```sql
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    MicrosoftId NVARCHAR(100) NOT NULL UNIQUE,
    Email NVARCHAR(200) NOT NULL UNIQUE,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    PhoneNumber NVARCHAR(20),
    Role NVARCHAR(50) NOT NULL,
    Department NVARCHAR(100),
    Status NVARCHAR(20) DEFAULT 'pending',
    IsActive BIT DEFAULT 1,
    LastLoginAt DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);

-- User indexes
CREATE INDEX IX_Users_Email ON Users (Email);
CREATE INDEX IX_Users_Role ON Users (Role);
CREATE INDEX IX_Users_Department ON Users (Department);
CREATE INDEX IX_Users_Status ON Users (Status);
CREATE INDEX IX_Users_MicrosoftId ON Users (MicrosoftId);
```

#### Departments Table
```sql
CREATE TABLE Departments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500),
    ManagerId INT FOREIGN KEY REFERENCES Users(Id),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

### 2. API Endpoints

#### User Management APIs
- `GET /api/users` - List all users with filtering
- `GET /api/users/{id}` - Get specific user details
- `POST /api/users` - Create new user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /api/users/search` - Advanced search
- `PUT /api/users/{id}/role` - Update user role
- `PUT /api/users/{id}/status` - Update user status
- `GET /api/users/{id}/permissions` - Get user permissions
- `POST /api/users/{id}/sync` - Sync with Active Directory

#### Request/Response Examples

#### Get Users List
```typescript
GET /api/users?role=conductor&status=active

Response:
{
  "data": [
    {
      "id": 1,
      "microsoftId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "conductor@europorte.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+33123456789",
      "role": "conductor",
      "department": "Operations",
      "status": "active",
      "isActive": true,
      "lastLoginAt": "2024-01-01T08:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### Create User
```typescript
POST /api/users
{
  "microsoftId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "newuser@europorte.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+33987654321",
  "role": "conductor",
  "department": "Operations",
  "status": "pending"
}

Response:
{
  "success": true,
  "data": {
    "id": 2,
    "microsoftId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "newuser@europorte.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "conductor",
    "department": "Operations",
    "status": "pending",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

## 🔄 Integration Points

### 1. Authentication System
- **Microsoft AD B2C**: User authentication through AD
- **Session Management**: User sessions managed
- **Token Management**: Access tokens managed
- **Permission Validation**: Permissions validated on each request

### 2. Mobile Application
- **User Profiles**: Mobile app displays user profiles
- **Role-based Access**: Mobile app respects user roles
- **Offline Support**: User data available offline
- **Synchronization**: User data synchronized with backend

### 3. Checklist Management
- **User Assignment**: Checklists assigned to users
- **Execution Tracking**: User execution tracked
- **Performance Analysis**: User performance analyzed
- **Compliance Reporting**: User compliance reported

### 4. Reporting System
- **User Analytics**: Analyze user activity and performance
- **Department Reports**: Generate department-specific reports
- **Role-based Reports**: Generate role-specific reports
- **Audit Trails**: Track user actions and changes

## 📈 Performance Considerations

### 1. Data Optimization
- **User Caching**: Frequently accessed users cached
- **Role Indexing**: Database indexes on roles
- **Lazy Loading**: User details loaded on demand
- **Pagination**: Large user lists paginated

### 2. Search Performance
- **Indexed Searches**: Database indexes on search fields
- **Result Caching**: Search results cached temporarily
- **Async Operations**: Non-blocking search operations
- **Filter Optimization**: Efficient filter query execution

### 3. Active Directory Sync
- **Batch Synchronization**: Batch AD synchronization
- **Incremental Sync**: Only sync changed data
- **Error Handling**: Robust error handling for sync failures
- **Retry Logic**: Automatic retry for failed syncs

## 🧪 Testing Strategy

### 1. Unit Tests
- **User CRUD**: Test user management operations
- **Role Management**: Test role assignment and permissions
- **Search Functionality**: Test search and filtering
- **Validation**: Test input validation and error handling

### 2. Integration Tests
- **API Endpoints**: Test all user management APIs
- **Database Integration**: Test database operations
- **AD Integration**: Test Active Directory synchronization
- **Permission System**: Test role-based access control

### 3. User Acceptance Tests
- **User Registration**: Test complete user registration workflow
- **Role Management**: Test role assignment and changes
- **Account Management**: Test account status management
- **Department Organization**: Test department management

## 🚀 Future Enhancements

### 1. Advanced Features
- **User Groups**: Create user groups for easier management
- **Custom Roles**: Define custom roles with specific permissions
- **User Templates**: Predefined user templates
- **Bulk Operations**: Bulk user management operations

### 2. Integration Improvements
- **Advanced AD Sync**: More sophisticated AD synchronization
- **SSO Integration**: Single sign-on with other systems
- **LDAP Integration**: Additional directory service integration
- **API User Management**: Programmatic user management

### 3. User Experience
- **Self-Service Portal**: Users manage their own profiles
- **User Dashboard**: Personalized user dashboards
- **Mobile User Management**: Mobile user management interface
- **Offline User Management**: Offline user management capabilities

## 📚 Related Documentation

- [Authentication System](./AUTHENTICATION_SYSTEM.md)
- [Checklist Management](./CHECKLIST_MANAGEMENT.md)
- [Mobile Application](./MOBILE_APPLICATION.md)
- [Reporting System](./REPORTING_SYSTEM.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook User Management system, including implementation details, use cases, and integration points. For technical implementation details, refer to the source code and API documentation.*
