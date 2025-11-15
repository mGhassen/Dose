import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

  // Supabase implementation
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, error: 'Supabase configuration missing' },
      { status: 500 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Verify the session and get user using the access token
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !authUser) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  // Get account and profile data
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select(`
      id,
      email,
      status,
      is_admin,
      profile_id,
      profiles (
        id,
        first_name,
        last_name,
        phone,
        profile_email,
        address,
        profession
      )
    `)
    .eq('auth_user_id', authUser.id)
    .single();
  
  if (accountError || !account) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }
  
  const profile = account.profiles as any;
  
  // Transform user data to match expected format
  const transformedUser = {
    id: authUser.id,
    account_id: account.id,
    email: account.email,
    profileEmail: profile?.profile_email || account.email,
    firstName: profile?.first_name || null,
    lastName: profile?.last_name || null,
    phone: profile?.phone || null,
    profession: profile?.profession || null,
    address: profile?.address || null,
    isAdmin: account.is_admin || false,
    status: account.status,
    role: account.is_admin ? 'admin' as const : 'user' as const,
    provider: 'email'
  };
  
  return NextResponse.json({ 
    success: true, 
    user: transformedUser 
  });
}