import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Removed isTokenExpired - we rely on Supabase's validation instead

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

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  // Validate token with Supabase - this is the source of truth
  // Don't check expiration ourselves - let Supabase handle it
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !authUser) {
    // Log the actual error for debugging
    console.error('[Session] Token validation failed:', {
      error: authError?.message,
      status: authError?.status,
      name: authError?.name,
      hasToken: !!token,
      tokenLength: token?.length
    });
    
    // Check if it's an expiration error from Supabase
    const errorMessage = authError?.message?.toLowerCase() || '';
    const isExpired = errorMessage.includes('expired') || 
                     errorMessage.includes('jwt') ||
                     errorMessage.includes('token');
    
    if (isExpired) {
      return NextResponse.json({ 
        success: false, 
        user: null,
        error: 'Token expired',
        needsRefresh: true
      }, { status: 401 });
    }
    
    // Other errors - don't try refresh, just fail
    return NextResponse.json({ 
      success: false, 
      user: null,
      error: authError?.message || 'Invalid token'
    }, { status: 401 });
  }
  
  // Log successful token validation
  console.log('[Session] Token validated successfully for user:', authUser.id);

  // Get account data first (without nested profile to avoid PGRST116)
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, email, status, is_admin, profile_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  
  if (accountError) {
    console.error('[Session] Account lookup error:', {
      error: accountError?.message,
      code: accountError?.code,
      userId: authUser.id
    });
    return NextResponse.json({ 
      success: false, 
      user: null,
      error: 'Account lookup failed'
    }, { status: 401 });
  }
  
  if (!account) {
    console.error('[Session] Account not found for user:', authUser.id);
    return NextResponse.json({ 
      success: false, 
      user: null,
      error: 'Account not found'
    }, { status: 401 });
  }
  
  // Get profile data separately if profile_id exists
  let profile = null;
  if (account.profile_id) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, profile_email, address, profession')
      .eq('id', account.profile_id)
      .maybeSingle();
    
    if (!profileError && profileData) {
      profile = profileData;
    }
  }
  
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
