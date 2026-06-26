import { NextRequest, NextResponse } from 'next/server';

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
      const redirectUrl = new URL('/auth/oauth-callback', request.url);
      redirectUrl.search = searchParams.toString();
      return NextResponse.redirect(redirectUrl);
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
