import { http, HttpResponse } from 'msw';
import { mockData } from '../data';

// Auth handlers
export const authHandlers = [
  // Login
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as any;
    
    if (!email || !password) {
      return HttpResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const user = mockData.users.find(u => u.email === email);
    
    if (!user) {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Different passwords for different users (for testing)
    const validPasswords = {
      'jean.dupont@kit.com': 'password123',
      'marie.martin@kit.com': 'password123',
      'pierre.durand@kit.com': 'password123',
      'admin@kit.com': 'password123'
    };
    
    if (password !== validPasswords[email as keyof typeof validPasswords]) {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Transform user data to match expected format
    const transformedUser = {
      id: user.id.toString(),
      account_id: `acc_${user.id}`,
      email: user.email,
      profileEmail: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: '',
      age: 0,
      profession: '',
      address: '',
      isAdmin: user.role === 'administrator',
      status: user.status,
      role: user.role === 'administrator' ? 'admin' as const : user.role === 'manager' ? 'manager' as const : 'user' as const,
      credit: 0,
      userType: user.role,
      accessiblePortals: user.role === 'administrator' ? ['admin', 'manager', 'conductor'] : user.role === 'manager' ? ['manager'] : ['conductor'],
      member_id: `mem_${user.id}`,
      provider: 'email'
    };
    
    const token = `mock-token-${user.id}`;
    
    return HttpResponse.json({
      success: true,
      user: transformedUser,
      session: {
        access_token: token,
        refresh_token: `refresh-${user.id}`
      },
      message: 'Login successful'
    });
  }),

  // Register
  http.post('/api/auth/register', async ({ request }) => {
    const { email, password, firstName, lastName, role } = await request.json() as any;
    
    const existingUser = mockData.users.find(u => u.email === email);
    if (existingUser) {
      return HttpResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
    
    const newUser = {
      id: mockData.users.length + 1,
      firstName: firstName || 'New',
      lastName: lastName || 'User',
      email,
      role: role === 'admin' ? 'administrator' as const : 'conductor' as const,
      department: 'Operations',
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;
    
    mockData.users.push(newUser);
    
    // Transform user data to match expected format
    const transformedUser = {
      id: newUser.id.toString(),
      account_id: `acc_${newUser.id}`,
      email: newUser.email,
      profileEmail: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: '',
      age: 0,
      profession: '',
      address: '',
      isAdmin: newUser.role === 'administrator',
      status: newUser.status,
      role: newUser.role === 'administrator' ? 'admin' as const : newUser.role === 'manager' ? 'manager' as const : 'user' as const,
      credit: 0,
      userType: newUser.role,
      accessiblePortals: newUser.role === 'administrator' ? ['admin', 'manager', 'conductor'] : newUser.role === 'manager' ? ['manager'] : ['conductor'],
      member_id: `mem_${newUser.id}`,
      provider: 'email'
    };
    
    return HttpResponse.json({
      user: transformedUser,
      message: 'Registration successful. Please wait for approval.'
    }, { status: 201 });
  }),

  // Logout
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // Refresh Token
  http.post('/api/auth/refresh', async ({ request }) => {
    const { refresh_token } = await request.json() as any;
    
    if (!refresh_token) {
      return HttpResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }
    
    // Extract user ID from refresh token
    const userId = refresh_token.replace('refresh-', '');
    const user = mockData.users.find(u => u.id.toString() === userId);
    
    if (!user) {
      return HttpResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }
    
    // Generate new tokens
    const newAccessToken = `mock-token-${user.id}`;
    const newRefreshToken = `refresh-${user.id}`;
    
    return HttpResponse.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  }),

  // Session
  http.get('/api/auth/session', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return HttpResponse.json({ user: null });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-token-', '');
    
    const user = mockData.users.find(u => u.id.toString() === userId);
    
    if (!user) {
      return HttpResponse.json({ user: null });
    }
    
    // Transform user data to match expected format
    const transformedUser = {
      id: user.id.toString(),
      account_id: `acc_${user.id}`,
      email: user.email,
      profileEmail: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: '',
      age: 0,
      profession: '',
      address: '',
      isAdmin: user.role === 'administrator',
      status: user.status,
      role: user.role === 'administrator' ? 'admin' as const : user.role === 'manager' ? 'manager' as const : 'user' as const,
      credit: 0,
      userType: user.role,
      accessiblePortals: user.role === 'administrator' ? ['admin', 'manager', 'conductor'] : user.role === 'manager' ? ['manager'] : ['conductor'],
      member_id: `mem_${user.id}`,
      provider: 'email'
    };
    
    
    return HttpResponse.json({ 
      success: true, 
      user: transformedUser 
    });
  }),

  // Profile Update
  http.put('/api/profile/update', async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return HttpResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-token-', '');
    
    // Find the user
    const userIndex = mockData.users.findIndex(u => u.id.toString() === userId);
    if (userIndex === -1) {
      return HttpResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const updateData = await request.json() as any;
    
    // Update the user data (only allow certain fields to be updated)
    const allowedFields = [
      'firstName', 
      'lastName', 
      'profileEmail', 
      'phone', 
      'address', 
      'profession', 
      'age'
    ];
    
    const updatedUser = { ...mockData.users[userIndex] };
    
    // Update only allowed fields
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        (updatedUser as any)[field] = updateData[field];
      }
    });
    
    // Update the mock data
    mockData.users[userIndex] = updatedUser;
    
    // Transform user data to match expected format
    const transformedUser = {
      id: updatedUser.id.toString(),
      account_id: `acc_${updatedUser.id}`,
      email: updatedUser.email,
      profileEmail: updateData.profileEmail || updatedUser.email,
      firstName: updateData.firstName || updatedUser.firstName,
      lastName: updateData.lastName || updatedUser.lastName,
      phone: updateData.phone || '',
      age: updateData.age || 0,
      profession: updateData.profession || '',
      address: updateData.address || '',
      isAdmin: updatedUser.role === 'administrator',
      status: updatedUser.status,
      role: updatedUser.role === 'administrator' ? 'admin' as const : updatedUser.role === 'manager' ? 'manager' as const : 'user' as const,
      credit: 0,
      userType: updatedUser.role,
      accessiblePortals: updatedUser.role === 'administrator' ? ['admin', 'manager', 'conductor'] : updatedUser.role === 'manager' ? ['manager'] : ['conductor'],
      member_id: `mem_${updatedUser.id}`,
      provider: 'email'
    };
    
    return HttpResponse.json({
      success: true,
      user: transformedUser,
      message: 'Profile updated successfully'
    });
  }),

  // Profile Get
  http.get('/api/profile/update', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return HttpResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-token-', '');
    
    const user = mockData.users.find(u => u.id.toString() === userId);
    
    
    if (!user) {
      return HttpResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Transform user data to match expected format
    const transformedUser = {
      id: user.id.toString(),
      account_id: `acc_${user.id}`,
      email: user.email,
      profileEmail: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: '',
      age: 0,
      profession: '',
      address: '',
      isAdmin: user.role === 'administrator',
      status: user.status,
      role: user.role === 'administrator' ? 'admin' as const : user.role === 'manager' ? 'manager' as const : 'user' as const,
      credit: 0,
      userType: user.role,
      accessiblePortals: user.role === 'administrator' ? ['admin', 'manager', 'conductor'] : user.role === 'manager' ? ['manager'] : ['conductor'],
      member_id: `mem_${user.id}`,
      provider: 'email'
    };
    
    return HttpResponse.json({
      success: true,
      user: transformedUser
    });
  }),

  // Google Auth
  http.post('/api/auth/google', async ({ request }) => {
    const { googleToken } = await request.json() as any;
    
    const mockGoogleUser = {
      id: mockData.users.length + 1,
      firstName: 'Google',
      lastName: 'User',
      email: 'google.user@kit.com',
      role: 'conductor' as const,
      department: 'Operations',
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;
    
    let user = mockData.users.find(u => u.email === mockGoogleUser.email);
    if (!user) {
      mockData.users.push(mockGoogleUser);
      user = mockGoogleUser;
    }
    
    // Transform user data to match expected format
    const transformedUser = {
      id: user!.id.toString(),
      account_id: `acc_${user!.id}`,
      email: user!.email,
      profileEmail: user!.email,
      firstName: user!.firstName,
      lastName: user!.lastName,
      phone: '',
      age: 0,
      profession: '',
      address: '',
      isAdmin: user!.role === 'administrator',
      status: user!.status,
      role: user!.role === 'administrator' ? 'admin' as const : user!.role === 'manager' ? 'manager' as const : 'user' as const,
      credit: 0,
      userType: user!.role,
      accessiblePortals: user!.role === 'administrator' ? ['admin', 'manager', 'conductor'] : user!.role === 'manager' ? ['manager'] : ['conductor'],
      member_id: `mem_${user!.id}`,
      provider: 'google'
    };
    
    const token = `mock-token-${user!.id}`;
    
    return HttpResponse.json({
      success: true,
      user: transformedUser,
      session: {
        access_token: token,
        refresh_token: `refresh-${user!.id}`
      },
      message: 'Google authentication successful'
    });
  }),

  // Forgot Password
  http.post('/api/auth/forgot-password', async ({ request }) => {
    const { email } = await request.json() as any;
    
    const user = mockData.users.find(u => u.email === email);
    if (!user) {
      return HttpResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      message: 'Password reset email sent'
    });
  }),

  // Reset Password
  http.post('/api/auth/reset-password', async ({ request }) => {
    const { token, password } = await request.json() as any;
    
    return HttpResponse.json({
      message: 'Password reset successful'
    });
  }),

  // Check Status
  http.get('/api/auth/check-status', ({ request }) => {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      return HttpResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    const user = mockData.users.find(u => u.email === email);
    
    if (!user) {
      return HttpResponse.json({
        exists: false,
        status: 'not_found'
      });
    }
    
    return HttpResponse.json({
      exists: true,
      status: user.status,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      }
    });
  }),

  // Get Pending Users (Admin only)
  http.get('/api/auth/pending-users', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-token-', '');
    const currentUser = mockData.users.find(u => u.id.toString() === userId);
    
    if (!currentUser || currentUser.role !== 'administrator') {
      return HttpResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const pendingUsers = mockData.users.filter(u => u.status === 'pending');
    
    return HttpResponse.json({
      success: true,
      users: pendingUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
         createdAt: user.createdAt
      }))
    });
  }),

  // Approve User (Admin only)
  http.post('/api/auth/approve-user', async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-token-', '');
    const currentUser = mockData.users.find(u => u.id.toString() === userId);
    
    if (!currentUser || currentUser.role !== 'administrator') {
      return HttpResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { userId: targetUserId } = await request.json() as any;
    
    const targetUser = mockData.users.find(u => u.id === targetUserId);
    if (!targetUser) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (targetUser.status !== 'pending') {
      return HttpResponse.json({ error: 'User is not pending approval' }, { status: 400 });
    }
    
    // Update user status to active
    targetUser.status = 'active';
    targetUser.updatedAt = new Date().toISOString();
    
    return HttpResponse.json({
      success: true,
      message: 'User approved successfully',
      user: {
        id: targetUser.id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
        status: targetUser.status
      }
    });
  }),

  // Reject User (Admin only)
  http.post('/api/auth/reject-user', async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-token-', '');
    const currentUser = mockData.users.find(u => u.id.toString() === userId);
    
    if (!currentUser || currentUser.role !== 'administrator') {
      return HttpResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { userId: targetUserId } = await request.json() as any;
    
    const targetUser = mockData.users.find(u => u.id === targetUserId);
    if (!targetUser) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (targetUser.status !== 'pending') {
      return HttpResponse.json({ error: 'User is not pending approval' }, { status: 400 });
    }
    
    // Update user status to suspended (rejected)
    targetUser.status = 'suspended';
    targetUser.updatedAt = new Date().toISOString();
    
    return HttpResponse.json({
      success: true,
      message: 'User rejected successfully',
      user: {
        id: targetUser.id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
        status: targetUser.status
      }
    });
  })
];
