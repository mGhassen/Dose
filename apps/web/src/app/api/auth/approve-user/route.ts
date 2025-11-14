import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward the request to the MSW handler
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For MSW, we'll handle this directly in the handler
    // This is just a passthrough for the MSW mock
    return NextResponse.json({ 
      success: true, 
      message: 'User approved successfully' 
    });
  } catch (error: any) {
    console.error('Error approving user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve user' },
      { status: error.status || 500 }
    );
  }
}
