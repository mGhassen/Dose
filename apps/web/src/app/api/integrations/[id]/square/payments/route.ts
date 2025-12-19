// Square Payments Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SquareListPaymentsResponse } from '@kit/types';
import { getIntegrationWithValidToken } from '../_utils';

const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';
const SQUARE_API_BASE = SQUARE_USE_SANDBOX 
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';

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
    
    const result = await getIntegrationWithValidToken(supabase, id, authHeader);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.status }
      );
    }

    const { accessToken } = result;

    console.log('[Square Payments] Using access token:', {
      integrationId: id,
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.substring(0, 10) + '...',
      sandbox: SQUARE_API_BASE.includes('sandbox'),
    });

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
      console.error('[Square Payments] API Error:', {
        status: response.status,
        statusText: response.statusText,
        details: errorDetails,
        queryParams: queryParams.toString(),
        apiBase: SQUARE_API_BASE,
        hasToken: !!accessToken,
        tokenLength: accessToken?.length,
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

