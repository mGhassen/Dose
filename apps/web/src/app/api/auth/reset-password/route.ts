import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.resetPasswordSchema)
    );
    if (!parsed.success) return parsed.response;

    return NextResponse.json({
      message: 'Password reset successful'
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}