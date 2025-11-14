import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@smartlogbook/mocks/data';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, role } = await request.json();
    
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
    
    const newUser = {
      id: mockUsers.length + 1,
      first_name: firstName || 'New',
      last_name: lastName || 'User',
      email,
      role: role === 'admin' ? 'administrator' as const : 'conductor' as const,
      department: 'Operations',
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;
    
    mockUsers.push(newUser);
    
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
    
    return NextResponse.json({
      user: transformedUser,
      message: 'Registration successful. Please wait for approval.'
    }, { status: 201 });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}