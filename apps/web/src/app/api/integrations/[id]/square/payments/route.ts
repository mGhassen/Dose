// Square Payments Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SquareListPaymentsResponse } from '@kit/types';

const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';
const SQUARE_API_BASE = SQUARE_USE_SANDBOX 
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';

async function getIntegrationAndVerifyAccess(
  supabase: any,
  integrationId: string
): Promise<{ integration: any; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { integration: null, error: { status: 401, message: 'Unauthorized' } };
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!account) {
    return { integration: null, error: { status: 404, message: 'Account not found' } };
  }

  const { data: integration, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('account_id', account.id)
    .eq('integration_type', 'square')
    .single();

  if (error) {
    return { integration: null, error: { status: 404, message: 'Square integration not found' } };
  }

  if (integration.status !== 'connected') {
    return { integration: null, error: { status: 400, message: 'Integration is not connected' } };
  }

  return { integration, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient(authHeader);
    
    const { integration, error: accessError } = await getIntegrationAndVerifyAccess(supabase, id);
    
    if (accessError) {
      return NextResponse.json(
        { error: accessError.message },
        { status: accessError.status }
      );
    }

    const accessToken = integration.access_token; // Should be decrypted in production
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not found' },
        { status: 401 }
      );
    }

    // Build query parameters
    let beginTime = searchParams.get('begin_time');
    let endTime = searchParams.get('end_time');
    const sortOrder = searchParams.get('sort_order');
    const cursor = searchParams.get('cursor');
    const locationId = searchParams.get('location_id');
    const total = searchParams.get('total');
    const last4 = searchParams.get('last_4');
    const cardBrand = searchParams.get('card_brand');
    const limit = searchParams.get('limit');

    // Convert date strings to ISO 8601 timestamps
    if (beginTime && !beginTime.includes('T')) {
      beginTime = `${beginTime}T00:00:00Z`;
    }
    if (endTime && !endTime.includes('T')) {
      endTime = `${endTime}T23:59:59Z`;
    }

    const queryParams = new URLSearchParams();
    if (beginTime) queryParams.append('begin_time', beginTime);
    if (endTime) queryParams.append('end_time', endTime);
    if (sortOrder) queryParams.append('sort_order', sortOrder);
    if (cursor) queryParams.append('cursor', cursor);
    if (locationId) queryParams.append('location_id', locationId);
    if (total) queryParams.append('total', total);
    if (last4) queryParams.append('last_4', last4);
    if (cardBrand) queryParams.append('card_brand', cardBrand);
    if (limit) queryParams.append('limit', limit);

    const response = await fetch(
      `${SQUARE_API_BASE}/v2/payments?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2024-01-18',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      console.error('Square Payments API Error:', {
        status: response.status,
        statusText: response.statusText,
        details: errorDetails,
        queryParams: queryParams.toString(),
      });
      return NextResponse.json(
        { error: `Square API error: ${response.statusText}`, details: errorDetails },
        { status: response.status }
      );
    }

    const data: SquareListPaymentsResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Square payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: error.message },
      { status: 500 }
    );
  }
}

