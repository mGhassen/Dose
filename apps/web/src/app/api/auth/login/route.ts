import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@smartlogbook/mocks/data';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const user = mockUsers.find(u => u.email === email);
    
    if (!user || password !== 'password123') {
      return NextResponse.json(
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
    
    return NextResponse.json({
      success: true,
      user: transformedUser,
      session: {
        access_token: token,
        refresh_token: `refresh-token-${user.id}`
      },
      message: 'Login successful'
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}