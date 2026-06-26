import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@kit/lib/supabase';

function parseGoogleName(metadata: Record<string, unknown>) {
  const givenName = (metadata.given_name as string) || '';
  const familyName = (metadata.family_name as string) || '';
  if (givenName || familyName) {
    return { firstName: givenName, lastName: familyName };
  }
  const fullName =
    (metadata.full_name as string) || (metadata.name as string) || '';
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'no_session' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'no_session' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    let { data: account, error: accountError } = await admin
      .from('accounts')
      .select('id, email, status, is_admin, profile_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (accountError) {
      console.error('Account lookup failed:', accountError);
      return NextResponse.json(
        { error: 'account_lookup_failed' },
        { status: 500 }
      );
    }

    if (!account) {
      const email = authUser.email;
      if (!email) {
        return NextResponse.json(
          { error: 'account_creation_failed' },
          { status: 400 }
        );
      }

      const { firstName, lastName } = parseGoogleName(
        authUser.user_metadata || {}
      );

      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .insert({
          first_name: firstName || null,
          last_name: lastName || null,
          profile_email: email,
        })
        .select()
        .single();

      if (profileError || !profile) {
        console.error('Profile creation failed:', profileError);
        return NextResponse.json(
          { error: 'account_creation_failed' },
          { status: 500 }
        );
      }

      const { data: newAccount, error: createError } = await admin
        .from('accounts')
        .insert({
          id: authUser.id,
          auth_user_id: authUser.id,
          email,
          status: 'pending',
          is_admin: false,
          profile_id: profile.id,
        })
        .select('id, email, status, is_admin, profile_id')
        .single();

      if (createError || !newAccount) {
        await admin.from('profiles').delete().eq('id', profile.id);
        console.error('Account creation failed:', createError);
        return NextResponse.json(
          { error: 'account_creation_failed' },
          { status: 500 }
        );
      }

      account = newAccount;
    }

    const accountStatus = (account.status || 'active').toLowerCase();

    if (accountStatus === 'pending') {
      return NextResponse.json({ redirectTo: '/auth/waiting-approval' });
    }

    if (accountStatus === 'suspended' || accountStatus === 'archived') {
      return NextResponse.json({ redirectTo: '/auth/account-status' });
    }

    return NextResponse.json({ redirectTo: '/auth/oauth-success', success: true });
  } catch (error) {
    console.error('OAuth complete error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
