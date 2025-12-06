// OAuth Callback Route (for any integration type)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Integration } from '@kit/types';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID;
const SQUARE_APP_SECRET = process.env.SQUARE_APPLICATION_SECRET;
const SQUARE_REDIRECT_URI = process.env.SQUARE_REDIRECT_URI || 'http://localhost:3000/api/integrations/oauth/square/callback';

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
  const response = await fetch('https://connect.squareup.com/oauth2/token', {
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
      const { data, error } = await supabase
        .from('integrations')
        .update({
          access_token: tokenData.access_token, // Should be encrypted in production
          refresh_token: tokenData.refresh_token, // Should be encrypted in production
          token_expires_at: tokenData.expires_at,
          status: 'connected',
          config: {
            ...(existing.config || {}),
            merchant_id: tokenData.merchant_id,
            location_id: tokenData.location_id,
          },
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      integration = data;
    } else {
      // Create new integration
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          account_id: account.id,
          integration_type: 'square',
          name: 'Square POS',
          status: 'connected',
          access_token: tokenData.access_token, // Should be encrypted in production
          refresh_token: tokenData.refresh_token, // Should be encrypted in production
          token_expires_at: tokenData.expires_at,
          config: {
            merchant_id: tokenData.merchant_id,
            location_id: tokenData.location_id,
          },
        })
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

