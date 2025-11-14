import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@kit/mocks/data';

export async function GET(request: NextRequest) {
  const useRealAPI = process.env.MIGRATION_USE_API_AUTH === 'true';
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  if (useRealAPI && apiBase) {
    try {
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/auth/session`, {
        method: 'GET',
        headers: {
          authorization: authHeader,
          accept: 'application/json',
        },
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Upstream auth/session fetch failed' },
        { status: 502 }
      );
    }
  }

  // Mock implementation when not using real API
  const token = authHeader.replace('Bearer ', '');
  const userId = token.replace('mock-token-', '');
  
  const user = mockUsers.find(u => u.id.toString() === userId);
  
  if (!user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
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
}