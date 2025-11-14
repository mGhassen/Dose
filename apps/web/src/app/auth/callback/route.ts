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

    

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(new URL(`/auth/login?error=oauth_error&message=${error}`, request.url));
    }

    if (type === 'recovery' && accessToken && refreshToken) {
      // This is a password reset callback
      const redirectUrl = `/auth/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (type === 'signup' && accessToken && refreshToken) {
      // This is an invitation acceptance callback
      const redirectUrl = `/auth/accept-invitation?access_token=${accessToken}&refresh_token=${refreshToken}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Handle Google OAuth callback with code
    if (code) {
      
      // Mock: Redirect to success page
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/oauth-success`;
      return NextResponse.redirect(redirectUrl);
    }

    // Handle callback from OAuth (after code exchange)
    if (!code && !accessToken && !refreshToken) {
      return NextResponse.redirect(new URL('/auth/oauth-success', request.url));
    }

    // Handle Google OAuth callback with tokens (legacy)
    if (accessToken && refreshToken && userId) {
      
      // Store tokens in a way that the client can access them
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('google_auth', 'success');
      redirectUrl.searchParams.set('access_token', accessToken);
      redirectUrl.searchParams.set('refresh_token', refreshToken);
      redirectUrl.searchParams.set('user_id', userId);
      
      return NextResponse.redirect(redirectUrl);
    }

    // Default fallback to login page
    return NextResponse.redirect(new URL('/auth/login', request.url));

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=callback-failed', request.url));
  }
} 