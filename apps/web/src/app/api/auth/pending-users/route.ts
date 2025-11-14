import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Forward the request to the MSW handler
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For MSW, we'll handle this directly in the handler
    // This is just a passthrough for the MSW mock
    return NextResponse.json({ 
      success: true, 
      users: [] // MSW will handle the actual data
    });
  } catch (error: any) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending users' },
      { status: error.status || 500 }
    );
  }
}
