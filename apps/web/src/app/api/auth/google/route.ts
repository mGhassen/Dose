import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@smartlogbook/mocks/data';

export async function POST(request: NextRequest) {
  try {
    const { googleToken } = await request.json();
    
    const mockGoogleUser = {
      id: mockUsers.length + 1,
      first_name: 'Google',
      last_name: 'User',
      email: 'google.user@smartlogbook.com',
      role: 'conductor' as const,
      department: 'Operations',
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;
    
    let user = mockUsers.find(u => u.email === mockGoogleUser.email);
    if (!user) {
      mockUsers.push(mockGoogleUser);
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
    
    return NextResponse.json({
      user: transformedUser,
      token,
      message: 'Google authentication successful'
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}