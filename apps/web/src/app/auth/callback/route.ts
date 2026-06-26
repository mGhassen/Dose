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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');
    const userId = searchParams.get('user_id');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/auth/login?error=oauth_error&message=${error}`, request.url)
      );
    }

    if (type === 'recovery' && accessToken && refreshToken) {
      const redirectUrl = `/auth/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (type === 'signup' && accessToken && refreshToken) {
      const redirectUrl = `/auth/accept-invitation?access_token=${accessToken}&refresh_token=${refreshToken}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (code) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.redirect(
          new URL('/auth/login?error=server_error', request.url)
        );
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: sessionData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError || !sessionData.session || !sessionData.user) {
        console.error('OAuth code exchange failed:', exchangeError);
        return NextResponse.redirect(
          new URL('/auth/login?error=exchange_failed', request.url)
        );
      }

      const authUser = sessionData.user;
      const admin = createSupabaseAdminClient();

      let { data: account, error: accountError } = await admin
        .from('accounts')
        .select('id, email, status, is_admin, profile_id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (accountError) {
        console.error('Account lookup failed:', accountError);
        return NextResponse.redirect(
          new URL('/auth/login?error=account_lookup_failed', request.url)
        );
      }

      if (!account) {
        const email = authUser.email;
        if (!email) {
          return NextResponse.redirect(
            new URL('/auth/login?error=account_creation_failed', request.url)
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
          return NextResponse.redirect(
            new URL('/auth/login?error=account_creation_failed', request.url)
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
          return NextResponse.redirect(
            new URL('/auth/login?error=account_creation_failed', request.url)
          );
        }

        account = newAccount;
      }

      const accountStatus = (account.status || 'active').toLowerCase();

      if (accountStatus === 'pending') {
        return NextResponse.redirect(
          new URL('/auth/waiting-approval', request.url)
        );
      }

      if (accountStatus === 'suspended' || accountStatus === 'archived') {
        return NextResponse.redirect(
          new URL('/auth/account-status', request.url)
        );
      }

      const sessionAccessToken = sessionData.session.access_token;
      const sessionRefreshToken = sessionData.session.refresh_token;

      const redirectUrl = new URL('/auth/oauth-success', request.url);
      redirectUrl.searchParams.set('access_token', sessionAccessToken);
      redirectUrl.searchParams.set('refresh_token', sessionRefreshToken);

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set('access_token', sessionAccessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    if (!code && !accessToken && !refreshToken) {
      return NextResponse.redirect(
        new URL('/auth/login?error=no_code', request.url)
      );
    }

    if (accessToken && refreshToken && userId) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('google_auth', 'success');
      redirectUrl.searchParams.set('access_token', accessToken);
      redirectUrl.searchParams.set('refresh_token', refreshToken);
      redirectUrl.searchParams.set('user_id', userId);

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set('access_token', accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    return NextResponse.redirect(new URL('/auth/login', request.url));
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=callback-failed', request.url)
    );
  }
}
