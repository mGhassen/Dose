// OAuth Initiate Route (for any integration type)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import crypto from 'crypto';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID;
const SQUARE_APP_SECRET = process.env.SQUARE_APPLICATION_SECRET;
const SQUARE_REDIRECT_URI = process.env.SQUARE_REDIRECT_URI || 'http://localhost:3000/api/integrations/oauth/square/callback';
const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationType: string }> }
) {
  try {
    const { integrationType } = await params;

    if (integrationType === 'pennylane') {
      const PENNYLANE_CLIENT_ID = process.env.PENNYLANE_CLIENT_ID;
      const PENNYLANE_REDIRECT_URI = process.env.PENNYLANE_REDIRECT_URI || 'http://localhost:3000/api/integrations/oauth/pennylane/callback';
      if (!PENNYLANE_CLIENT_ID) {
        return NextResponse.json({ error: 'Pennylane credentials not configured' }, { status: 500 });
      }
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
      }
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const supabase = supabaseServer();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { data: account } = await supabase.from('accounts').select('id').eq('auth_user_id', user.id).single();
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      const state = crypto.randomBytes(32).toString('hex');
      const authUrl = new URL('https://app.pennylane.com/oauth/authorize');
      authUrl.searchParams.set('client_id', PENNYLANE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', PENNYLANE_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'transactions:readonly');
      authUrl.searchParams.set('state', state);
      return NextResponse.json({ auth_url: authUrl.toString(), state });
    }

    if (integrationType !== 'square') {
      return NextResponse.json(
        { error: `OAuth not implemented for integration type: ${integrationType}` },
        { status: 501 }
      );
    }

    if (!SQUARE_APP_ID || !SQUARE_APP_SECRET) {
      return NextResponse.json(
        { error: 'Square application credentials not configured' },
        { status: 500 }
      );
    }

    // Auto-detect sandbox mode from client_id if not explicitly set
    // Sandbox client IDs start with "sandbox-"
    // Calculate this early so we can use it in validation
    const isSandbox = SQUARE_USE_SANDBOX || (SQUARE_APP_ID?.startsWith('sandbox-') ?? false);

    // Validate redirect URI format
    if (!SQUARE_REDIRECT_URI || !SQUARE_REDIRECT_URI.startsWith('http')) {
      return NextResponse.json(
        { 
          error: 'Invalid redirect URI configuration',
          details: 'SQUARE_REDIRECT_URI must be a valid HTTP/HTTPS URL and must match exactly what is configured in Square Dashboard'
        },
        { status: 500 }
      );
    }

    // Prevent common mistake: redirect_uri should not be Square's OAuth URL
    if (SQUARE_REDIRECT_URI.includes('squareup.com/oauth2/authorize') || 
        SQUARE_REDIRECT_URI.includes('squareupsandbox.com/oauth2/authorize')) {
      const correctUri = 'http://localhost:3000/api/integrations/oauth/square/callback';
      console.error('[OAuth Initiate] ERROR: SQUARE_REDIRECT_URI is set to Square OAuth URL instead of your callback URL');
      console.error('[OAuth Initiate] Current (WRONG):', SQUARE_REDIRECT_URI);
      console.error('[OAuth Initiate] Should be:', correctUri);
      console.error('[OAuth Initiate] Fix your .env file: SQUARE_REDIRECT_URI=' + correctUri);
      return NextResponse.json(
        { 
          error: 'Invalid redirect URI configuration',
          details: `SQUARE_REDIRECT_URI cannot be Square's OAuth URL. It must be your callback URL.`,
          current: SQUARE_REDIRECT_URI,
          shouldBe: correctUri,
          fix: `Set SQUARE_REDIRECT_URI=${correctUri} in your .env file`
        },
        { status: 500 }
      );
    }

    // Additional validation: redirect URI should contain our callback path
    if (!SQUARE_REDIRECT_URI.includes('/api/integrations/oauth/square/callback')) {
      const correctUri = 'http://localhost:3000/api/integrations/oauth/square/callback';
      console.error('[OAuth Initiate] ERROR: SQUARE_REDIRECT_URI does not point to callback endpoint');
      console.error('[OAuth Initiate] Current:', SQUARE_REDIRECT_URI);
      console.error('[OAuth Initiate] Should be:', correctUri);
      return NextResponse.json(
        { 
          error: 'Invalid redirect URI configuration',
          details: `SQUARE_REDIRECT_URI must point to your callback endpoint: /api/integrations/oauth/square/callback`,
          current: SQUARE_REDIRECT_URI,
          shouldBe: correctUri,
          fix: `Set SQUARE_REDIRECT_URI=${correctUri} in your .env file`
        },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
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

    const state = crypto.randomBytes(32).toString('hex');
    const redirectUri = `${request.nextUrl.origin}/api/integrations/oauth/square/callback`;

    const oauthBaseUrl = isSandbox
      ? 'https://connect.squareupsandbox.com/oauth2/authorize'
      : 'https://connect.squareup.com/oauth2/authorize';

    const authUrl = new URL(oauthBaseUrl);
    authUrl.searchParams.append('client_id', SQUARE_APP_ID);
    authUrl.searchParams.append('scope', 'MERCHANT_PROFILE_READ PAYMENTS_READ ORDERS_READ ITEMS_READ');
    authUrl.searchParams.append('session', 'false');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('redirect_uri', redirectUri);

    console.log('[OAuth Initiate]', {
      integrationType,
      sandbox: isSandbox,
      redirectUri,
      clientId: SQUARE_APP_ID?.substring(0, 20) + '...',
    });

    return NextResponse.json({
      auth_url: authUrl.toString(),
      state: state,
    });
  } catch (error: any) {
    console.error('Error initiating OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth', details: error.message },
      { status: 500 }
    );
  }
}

