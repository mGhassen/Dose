import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@smartlogbook/mocks/data';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-token-', '');
    
    // Find the user
    const userIndex = mockUsers.findIndex(u => u.id.toString() === userId);
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const updateData = await request.json();
    
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
    
    const updatedUser = { ...mockUsers[userIndex] };
    
    // Update only allowed fields
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        (updatedUser as any)[field] = updateData[field];
      }
    });
    
    // Update the mock data
    mockUsers[userIndex] = updatedUser;
    
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
    
    return NextResponse.json({
      success: true,
      user: transformedUser,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const userId = token.replace('mock-token-', '');
    const user = mockUsers.find(u => u.id.toString() === userId);
    
    if (!user) {
      return NextResponse.json(
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
    
    return NextResponse.json({
      success: true,
      user: transformedUser
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
