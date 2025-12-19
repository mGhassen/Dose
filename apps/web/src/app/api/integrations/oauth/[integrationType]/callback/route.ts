// OAuth Callback Route (for any integration type)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Integration } from '@kit/types';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID;
const SQUARE_APP_SECRET = process.env.SQUARE_APPLICATION_SECRET;
const SQUARE_REDIRECT_URI = process.env.SQUARE_REDIRECT_URI || 'http://localhost:3000/api/integrations/oauth/square/callback';
const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';

function transformIntegration(row: any): Integration {
  return {
    id: row.id,
    account_id: row.account_id,
    integration_type: row.integration_type,
    name: row.name,
    status: row.status,
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    token_expires_at: row.token_expires_at,
    config: row.config || {},
    last_sync_at: row.last_sync_at,
    last_sync_status: row.last_sync_status,
    last_sync_error: row.last_sync_error,
    sync_frequency: row.sync_frequency,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  merchant_id?: string;
  location_id?: string;
}> {
  // Auto-detect sandbox mode from client_id if not explicitly set
  const isSandbox = SQUARE_USE_SANDBOX || (SQUARE_APP_ID?.startsWith('sandbox-') ?? false);
  
  const tokenUrl = isSandbox
    ? 'https://connect.squareupsandbox.com/oauth2/token'
    : 'https://connect.squareup.com/oauth2/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      client_id: SQUARE_APP_ID,
      client_secret: SQUARE_APP_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: SQUARE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Square token exchange failed: ${error}`);
  }

  const data = await response.json();
  
  // Calculate expiration time (tokens typically expire in 30 days)
  const expiresAt = data.expires_at 
    ? new Date(data.expires_at).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    merchant_id: data.merchant_id,
    location_id: data.location_id,
  };
}

// GET handler for OAuth redirect from Square
// Square redirects to this route with GET query parameters
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integrationType: string }> }
) {
  try {
    const { integrationType } = await params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('[OAuth Callback]', { integrationType, code: code ? 'present' : 'missing', state: state ? 'present' : 'missing', error });

    // Get the origin from the request
    const origin = request.nextUrl.origin;
    const baseUrl = `${origin}/settings/integrations`;

    // Handle OAuth errors from Square
    if (error) {
      const errorMessage = errorDescription || error;
      const redirectUrl = new URL(baseUrl);
      redirectUrl.searchParams.set('error', errorMessage);
      redirectUrl.searchParams.set('integration_type', integrationType);
      console.log('[OAuth Callback] Redirecting with error:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
    }

    // Redirect to frontend page with code and state
    // The frontend will handle the OAuth completion
    if (code && state) {
      const redirectUrl = new URL(baseUrl);
      redirectUrl.searchParams.set('code', code);
      redirectUrl.searchParams.set('state', state);
      redirectUrl.searchParams.set('integration_type', integrationType);
      console.log('[OAuth Callback] Redirecting to:', redirectUrl.toString());
      
      // Return HTML with both meta refresh and JavaScript redirect as fallback
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${redirectUrl.toString()}" />
  <script>
    window.location.href = ${JSON.stringify(redirectUrl.toString())};
  </script>
</head>
<body>
  <p>Redirecting to integrations page...</p>
  <p>If you are not redirected automatically, <a href="${redirectUrl.toString()}">click here</a>.</p>
</body>
</html>`;
      
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // If no code or state, redirect with error
    const redirectUrl = new URL(baseUrl);
    redirectUrl.searchParams.set('error', 'Missing authorization code or state');
    redirectUrl.searchParams.set('integration_type', integrationType);
    console.log('[OAuth Callback] Missing code/state, redirecting with error:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  } catch (error: any) {
    console.error('[OAuth Callback] Error handling OAuth callback:', error);
    const origin = request.nextUrl.origin;
    const redirectUrl = new URL(`${origin}/settings/integrations`);
    redirectUrl.searchParams.set('error', error.message || 'Failed to handle OAuth callback');
    const { integrationType } = await params;
    redirectUrl.searchParams.set('integration_type', integrationType);
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationType: string }> }
) {
  try {
    const { integrationType } = await params;
    
    if (integrationType !== 'square') {
      return NextResponse.json(
        { error: `OAuth callback not implemented for integration type: ${integrationType}` },
        { status: 501 }
      );
    }

    if (!SQUARE_APP_ID || !SQUARE_APP_SECRET) {
      return NextResponse.json(
        { error: 'Square application credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient(authHeader);
    
    // Get current user's account
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Check if Square integration already exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('*')
      .eq('account_id', account.id)
      .eq('integration_type', 'square')
      .single();

    let integration;
    if (existing) {
      // Update existing integration
      const updateData: any = {
        access_token: tokenData.access_token, // Should be encrypted in production
        refresh_token: tokenData.refresh_token, // Should be encrypted in production
        token_expires_at: tokenData.expires_at,
        status: 'connected',
        is_active: true,
        config: {
          ...(existing.config || {}),
          merchant_id: tokenData.merchant_id,
          location_id: tokenData.location_id,
        },
      };
      
      console.log('[OAuth Callback] Updating integration with data:', {
        id: existing.id,
        status: updateData.status,
        is_active: updateData.is_active,
      });
      
      const { data, error } = await supabase
        .from('integrations')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      integration = data;
    } else {
      // Create new integration
      const insertData = {
        account_id: account.id,
        integration_type: 'square',
        name: 'Square POS',
        status: 'connected',
        access_token: tokenData.access_token, // Should be encrypted in production
        refresh_token: tokenData.refresh_token, // Should be encrypted in production
        token_expires_at: tokenData.expires_at,
        is_active: true,
        config: {
          merchant_id: tokenData.merchant_id,
          location_id: tokenData.location_id,
        },
      };
      
      console.log('[OAuth Callback] Inserting integration with data:', {
        account_id: insertData.account_id,
        integration_type: insertData.integration_type,
        status: insertData.status,
        is_active: insertData.is_active,
      });
      
      const { data, error } = await supabase
        .from('integrations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      integration = data;
    }

    return NextResponse.json(transformIntegration(integration));
  } catch (error: any) {
    console.error('Error completing OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to complete OAuth', details: error.message },
      { status: 500 }
    );
  }
}

