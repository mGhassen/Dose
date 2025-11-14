import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@smartlogbook/mocks/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({
        exists: false,
        status: 'not_found'
      });
    }
    
    return NextResponse.json({
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
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}