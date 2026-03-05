import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.refreshTokenSchema)
    );
    if (!parsed.success) return parsed.response;
    const { refresh_token } = parsed.data;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Refresh the session using Supabase's refreshSession
    const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (refreshError || !sessionData.session) {
      return NextResponse.json(
        { error: refreshError?.message || 'Failed to refresh session' },
        { status: 401 }
      );
    }
    
    const response = NextResponse.json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in: sessionData.session.expires_in,
      token_type: 'Bearer'
    });

    response.cookies.set('access_token', sessionData.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
    
  } catch (error: any) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

