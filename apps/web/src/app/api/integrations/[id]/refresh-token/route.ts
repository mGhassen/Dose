import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID;
const SQUARE_APP_SECRET = process.env.SQUARE_APPLICATION_SECRET;
const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const supabase = supabaseServer();
    
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

    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', id)
      .eq('account_id', account.id)
      .single();

    if (fetchError || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    if (integration.integration_type === 'pennylane') {
      if (!integration.refresh_token) {
        return NextResponse.json({ error: 'No refresh token available' }, { status: 400 });
      }
      const PENNYLANE_CLIENT_ID = process.env.PENNYLANE_CLIENT_ID;
      const PENNYLANE_CLIENT_SECRET = process.env.PENNYLANE_CLIENT_SECRET;
      if (!PENNYLANE_CLIENT_ID || !PENNYLANE_CLIENT_SECRET) {
        return NextResponse.json({ error: 'Pennylane credentials not configured' }, { status: 500 });
      }
      const body = new URLSearchParams({
        client_id: PENNYLANE_CLIENT_ID,
        client_secret: PENNYLANE_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      });
      const response = await fetch('https://app.pennylane.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: 'Failed to refresh Pennylane token', details: text }, { status: response.status });
      }
      const data = await response.json();
      const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null;
      const { data: updated, error: updateError } = await supabase
        .from('integrations')
        .update({
          access_token: data.access_token,
          refresh_token: data.refresh_token ?? integration.refresh_token,
          token_expires_at: expiresAt,
          status: 'connected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      return NextResponse.json(updated);
    }

    if (integration.integration_type !== 'square') {
      return NextResponse.json({ error: 'Token refresh only implemented for Square and Pennylane' }, { status: 501 });
    }

    if (!integration.refresh_token) {
      return NextResponse.json({ error: 'No refresh token available' }, { status: 400 });
    }

    const squareTokenEndpoint = SQUARE_USE_SANDBOX
      ? 'https://connect.squareupsandbox.com/oauth2/token'
      : 'https://connect.squareup.com/oauth2/token';

    const response = await fetch(squareTokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        client_secret: SQUARE_APP_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to refresh token: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    const { data: updatedIntegration, error: updateError } = await supabase
      .from('integrations')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: new Date(Date.now() + data.expires_at * 1000).toISOString(),
        status: 'connected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updatedIntegration);
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token', details: error.message },
      { status: 500 }
    );
  }
}

