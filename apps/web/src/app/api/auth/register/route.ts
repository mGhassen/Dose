import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone } = await request.json();
    
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
    
    // Check if user already exists
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingAccount) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        email_redirect_to: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    });
    
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      );
    }
    
    // Create profile record
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        profile_email: email
      })
      .select()
      .single();
    
    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || 'Failed to create profile' },
        { status: 500 }
      );
    }
    
    // Create account record
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({
        id: authData.user.id,
        auth_user_id: authData.user.id,
        email: email,
        status: 'pending', // New users start as pending
        is_admin: false,
        profile_id: profile.id
      })
      .select()
      .single();
    
    if (accountError) {
      // Clean up profile if account creation fails
      await supabase.from('profiles').delete().eq('id', profile.id);
      return NextResponse.json(
        { error: accountError.message || 'Failed to create account' },
        { status: 500 }
      );
    }
    
    // Transform user data to match expected format
    const transformedUser = {
      id: authData.user.id,
      account_id: account.id,
      email: account.email,
      profileEmail: profile.profile_email || account.email,
      firstName: profile.first_name || null,
      lastName: profile.last_name || null,
      phone: profile.phone || null,
      isAdmin: account.is_admin || false,
      status: account.status,
      role: 'user' as const,
      provider: 'email'
    };
    
    return NextResponse.json({
      user: transformedUser,
      message: 'Registration successful. Please wait for approval.'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}