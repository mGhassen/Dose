import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Decode JWT to check expiration without verification
 * This is safe because we'll verify with Supabase anyway
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return true;
    
    // Check if token expires in less than 5 minutes (refresh proactively)
    const expiresAt = exp * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return expiresAt < (now + fiveMinutes);
  } catch {
    return true; // If we can't decode, assume expired
  }
}

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
  
  if (!token || token.trim() === '') {
    return NextResponse.json({ 
      success: false, 
      user: null,
      error: 'No token provided'
    }, { status: 401 });
  }

  // Check if token is expired before making API call
  if (isTokenExpired(token)) {
    return NextResponse.json({ 
      success: false, 
      user: null,
      error: 'Token expired',
      needsRefresh: true
    }, { status: 401 });
  }
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  // Validate token with Supabase
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !authUser) {
    // Only return needsRefresh if it's an expiration error
    const errorMessage = authError?.message?.toLowerCase() || '';
    const isExpired = errorMessage.includes('expired') || 
                     errorMessage.includes('jwt') ||
                     authError?.status === 401;
    
    if (isExpired) {
      return NextResponse.json({ 
        success: false, 
        user: null,
        error: 'Token expired',
        needsRefresh: true
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: false, 
      user: null,
      error: authError?.message || 'Invalid session'
    }, { status: 401 });
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
