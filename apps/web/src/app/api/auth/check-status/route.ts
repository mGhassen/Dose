import { NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@kit/mocks/data';
import { createSupabaseAdminClient } from '@kit/lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const raw = typeof body?.email === 'string' ? body.email.trim() : '';
    const email = raw.toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server misconfigured: missing Supabase credentials',
        },
        { status: 503 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('status, auth_user_id')
      .eq('email', email)
      .maybeSingle();

    if (accountError) {
      console.error('check-status account query:', accountError);
      return NextResponse.json(
        { success: false, error: 'Failed to look up account' },
        { status: 500 }
      );
    }

    if (!account) {
      return NextResponse.json({
        success: false,
        error: 'Account not found',
      });
    }

    const status = (account.status || 'active').toLowerCase();

    let authStatus: 'confirmed' | 'unconfirmed' = 'unconfirmed';
    const { data: authData, error: authErr } =
      await supabase.auth.admin.getUserById(account.auth_user_id);

    if (!authErr && authData?.user) {
      authStatus = authData.user.email_confirmed_at ? 'confirmed' : 'unconfirmed';
    }

    return NextResponse.json({
      success: true,
      status,
      authStatus,
    });
  } catch (error) {
    console.error('check-status POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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