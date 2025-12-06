// OAuth Initiate Route (for any integration type)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import crypto from 'crypto';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID;
const SQUARE_APP_SECRET = process.env.SQUARE_APPLICATION_SECRET;
const SQUARE_REDIRECT_URI = process.env.SQUARE_REDIRECT_URI || 'http://localhost:3000/api/integrations/oauth/square/callback';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationType: string }> }
) {
  try {
    const { integrationType } = await params;
    
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

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Build Square OAuth URL
    const authUrl = new URL('https://squareup.com/oauth2/authorize');
    authUrl.searchParams.append('client_id', SQUARE_APP_ID);
    authUrl.searchParams.append('scope', 'MERCHANT_PROFILE_READ PAYMENTS_READ ORDERS_READ ITEMS_READ');
    authUrl.searchParams.append('session', 'false');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('redirect_uri', SQUARE_REDIRECT_URI);

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

