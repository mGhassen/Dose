import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid credentials' },
        { status: 401 }
      );
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
      .eq('auth_user_id', authData.user.id)
      .single();
    
    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Check account status
    if (account.status === 'pending') {
      return NextResponse.json(
        { 
          error: 'Account pending approval',
          redirectTo: '/auth/account-status'
        },
        { status: 403 }
      );
    }
    
    if (account.status === 'suspended' || account.status === 'archived') {
      return NextResponse.json(
        { error: 'Account is suspended or archived' },
        { status: 403 }
      );
    }
    
    const profile = account.profiles as any;
    
    // Transform user data to match expected format
    const transformedUser = {
      id: authData.user.id,
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
      user: transformedUser,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token
      },
      message: 'Login successful'
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}