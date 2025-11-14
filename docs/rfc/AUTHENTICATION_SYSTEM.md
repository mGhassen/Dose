# Authentication System - SmartLogBook

## 📋 Overview

The SmartLogBook authentication system provides secure access control for railway locomotive inspection and maintenance management. It integrates with Microsoft Azure AD B2C to leverage Europorte's existing identity infrastructure while maintaining application-specific user management.

## 🎯 Objectives

- **Secure Access Control**: Ensure only authorized users can access the application ✅ **IMPLEMENTED**
- **Europorte Integration**: Seamless integration with Microsoft Entra ID (Azure AD B2C) ⚠️ **MOCK IMPLEMENTED**
- **Role-Based Access**: Support different user roles (Conductor, Manager, Administrator) ✅ **IMPLEMENTED**
- **Session Management**: Maintain secure user sessions across the application ✅ **IMPLEMENTED**
- **Account Lifecycle**: Handle user registration, approval, and status management ✅ **IMPLEMENTED**
- **User Approval Workflow**: Admin approval system for new users ✅ **IMPLEMENTED**
- **Password Management**: Forgot password and reset functionality ✅ **IMPLEMENTED**

## 🏗️ Architecture

### Authentication Flow
```
User Login → Microsoft AD B2C → JWT Token → Session Management → API Authorization
```

### Components
- **Frontend**: Login/Register forms with Microsoft AD B2C integration
- **API Routes**: Authentication endpoints with business logic
- **Session Management**: Persistent authentication state
- **Role Management**: User role assignment and validation
- **Account Status**: User approval workflow

## 🔧 Implementation Details

### 1. Login Interface

#### Structure
- **Left Section**: Login form with Europorte account integration
- **Right Section**: Visual branding and application information
- **Responsive Design**: Adapts to different screen sizes

#### Microsoft AD B2C Integration
```typescript
// Login flow with Microsoft AD B2C
const loginWithMicrosoft = async () => {
  const popup = window.open(
    `${MSAL_CONFIG.authority}/oauth2/v2.0/authorize?` +
    `client_id=${MSAL_CONFIG.clientId}&` +
    `response_type=code&` +
    `redirect_uri=${MSAL_CONFIG.redirectUri}&` +
    `scope=${MSAL_CONFIG.scopes.join(' ')}`,
    'msal-popup',
    'width=600,height=600'
  );
  
  // Handle popup response
  const result = await handlePopupResponse(popup);
  return result;
};
```

#### Validation Features
- **Real-time Validation**: Immediate feedback on login attempts
- **Error Handling**: Clear error messages for failed authentication
- **Account Verification**: Check if user exists in application database
- **Active Directory Sync**: Automatic user data synchronization

### 2. User Registration

#### Registration Process
1. **Microsoft AD B2C Authentication**: User authenticates with Europorte credentials
2. **User Data Sync**: Automatic population from Active Directory
3. **Role Assignment**: Administrator assigns appropriate role
4. **Account Approval**: Manager approval workflow
5. **Account Activation**: User can access application

#### Data Synchronization
```typescript
interface UserData {
  microsoftId: string;        // SID from Microsoft AD
  email: string;              // Europorte email
  firstName: string;          // From AD
  lastName: string;           // From AD
  phoneNumber: string;        // From AD
  department: string;         // From AD
  role: UserRole;            // Assigned by admin
  status: AccountStatus;     // Pending/Active/Disabled
}
```

### 3. Session Management

#### Session Features
- **Persistent Sessions**: Maintain login state across browser sessions
- **Token Refresh**: Automatic token renewal
- **Session Validation**: Regular session health checks
- **Secure Logout**: Complete session termination

#### Implementation
```typescript
// Session management hook
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check existing session
    checkSession();
  }, []);
  
  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return { user, isLoading, login, logout };
}
```

### 4. Role-Based Access Control

#### User Roles
- **Conductor**: Mobile app access for checklist execution
- **Manager**: Web access for supervision and parameter configuration
- **Administrator**: Full application access and user management

#### Role Implementation
```typescript
enum UserRole {
  CONDUCTOR = 'conductor',
  MANAGER = 'manager',
  ADMINISTRATOR = 'administrator'
}

// Role-based route protection
export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }
  
  return <>{children}</>;
}
```

## 📱 Use Cases

### 1. User Login
**Scenario**: A manager needs to access the web application to review checklist results.

**Steps**:
1. Navigate to login page
2. Click "Connexion avec compte Europorte"
3. Microsoft AD B2C popup opens
4. Enter Europorte email and password
5. System validates credentials and user status
6. Redirect to dashboard with appropriate permissions

**Expected Result**: Manager gains access to management features based on their role.

### 2. New User Registration
**Scenario**: A new conductor needs to be added to the system.

**Steps**:
1. Administrator initiates user creation
2. System prompts for Microsoft AD B2C authentication
3. User data automatically populated from AD
4. Administrator assigns "Conductor" role
5. Account status set to "Pending Approval"
6. Manager approves the account
7. User receives notification and can access mobile app

**Expected Result**: New conductor can access mobile application for checklist execution.

### 3. Account Status Management
**Scenario**: A user's account needs to be temporarily disabled.

**Steps**:
1. Administrator accesses user management
2. Selects user to modify
3. Changes account status to "Disabled"
4. System immediately revokes access
5. User receives notification of status change

**Expected Result**: User loses access to application until account is reactivated.

### 4. Password Reset
**Scenario**: A user forgets their password.

**Steps**:
1. User clicks "Forgot Password" on login page
2. Enters Europorte email address
3. System sends reset link via Microsoft AD B2C
4. User clicks link and sets new password
5. System validates new password
6. User can login with new credentials

**Expected Result**: User regains access with new password.

## 🔒 Security Features

### 1. Microsoft AD B2C Integration
- **OAuth 2.0/OpenID Connect**: Industry-standard authentication protocols
- **Multi-Factor Authentication**: Support for MFA through Azure AD
- **Password Policies**: Enforced by Microsoft AD B2C
- **Account Lockout**: Protection against brute force attacks

### 2. Session Security
- **JWT Tokens**: Secure token-based authentication
- **Token Expiration**: Automatic token refresh
- **Secure Storage**: Tokens stored securely in browser
- **CSRF Protection**: Cross-site request forgery prevention

### 3. Data Protection
- **Input Validation**: All user inputs validated
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Cross-site scripting prevention
- **Data Encryption**: Sensitive data encrypted in transit and at rest

## 🚀 API Endpoints

### Authentication Endpoints ✅ **IMPLEMENTED**
- `POST /api/auth/login` - User login with credentials
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Session validation
- `POST /api/auth/google` - Google OAuth integration (mock)
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset execution
- `GET /api/auth/check-status` - Account status check
- `POST /api/auth/accept-invitation` - Invitation acceptance
- `GET /api/auth/pending-users` - Get pending user approvals ✅ **NEW**
- `POST /api/auth/approve-user` - Approve user account ✅ **NEW**
- `POST /api/auth/reject-user` - Reject user account ✅ **NEW**

### Request/Response Examples

#### Login Request
```typescript
POST /api/auth/login
{
  "email": "user@europorte.com",
  "password": "securePassword123"
}
```

#### Login Response
```typescript
{
  "success": true,
  "user": {
    "id": "123",
    "email": "user@europorte.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "manager",
    "department": "Operations",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

## 📊 Error Handling

### Common Error Scenarios
1. **Invalid Credentials**: Clear error message for wrong email/password
2. **Account Not Found**: User not registered in application
3. **Account Disabled**: User account temporarily disabled
4. **Pending Approval**: User awaiting manager approval
5. **Session Expired**: Automatic redirect to login

### Error Response Format
```typescript
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "details": "Please check your credentials and try again"
  }
}
```

## 🔄 Integration Points

### 1. Microsoft AD B2C
- **User Directory**: Source of truth for user identities
- **Authentication**: Handles login/logout processes
- **User Attributes**: Automatic synchronization of user data
- **Password Management**: Password reset and change operations

### 2. Application Database
- **User Profiles**: Extended user information
- **Role Assignments**: Application-specific roles
- **Session Storage**: Active session tracking
- **Audit Logs**: Authentication event logging

### 3. Mobile Application
- **Token Sharing**: Shared authentication tokens
- **Offline Support**: Cached authentication state
- **Biometric Authentication**: Integration with device biometrics
- **Push Notifications**: Authentication-related notifications

## 📈 Performance Considerations

### 1. Caching Strategy
- **Session Caching**: In-memory session storage
- **Token Caching**: Client-side token storage
- **User Data Caching**: Cached user profile data
- **Role Caching**: Cached role permissions

### 2. Optimization Techniques
- **Lazy Loading**: Load authentication components on demand
- **Token Refresh**: Background token renewal
- **Connection Pooling**: Efficient database connections
- **CDN Integration**: Static asset delivery

## 🧪 Testing Strategy

### 1. Unit Tests
- **Authentication Logic**: Test login/logout functions
- **Role Validation**: Test role-based access control
- **Session Management**: Test session lifecycle
- **Error Handling**: Test error scenarios

### 2. Integration Tests
- **Microsoft AD B2C**: Test AD integration
- **API Endpoints**: Test authentication endpoints
- **Database Integration**: Test user data persistence
- **Session Persistence**: Test session across requests

### 3. Security Tests
- **Penetration Testing**: Test for security vulnerabilities
- **Token Security**: Test token handling and validation
- **Input Validation**: Test input sanitization
- **Access Control**: Test unauthorized access attempts

## 🚀 Future Enhancements

### 1. Advanced Security
- **Biometric Authentication**: Fingerprint/face recognition
- **Device Trust**: Trusted device management
- **Risk-Based Authentication**: Adaptive authentication
- **Audit Logging**: Comprehensive audit trails

### 2. User Experience
- **Single Sign-On**: SSO with other Europorte applications
- **Remember Me**: Extended session options
- **Quick Login**: PIN-based quick access
- **Multi-Language**: Localized authentication interfaces

### 3. Integration Improvements
- **Azure AD Groups**: Role mapping from AD groups
- **Conditional Access**: Location-based access control
- **API Authentication**: Service-to-service authentication
- **Third-Party Integration**: External system authentication

## 📚 Related Documentation

- [User Management System](./USER_MANAGEMENT.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)
- [Mobile Application](./MOBILE_APPLICATION.md)

---

*This documentation provides comprehensive coverage of the SmartLogBook authentication system, including implementation details, use cases, and security considerations. For technical implementation details, refer to the source code and API documentation.*
