// Square Orders Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SquareListOrdersResponse } from '@kit/types';
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

    const { integration, accessToken } = result;

    console.log('[Square Orders] Using access token:', {
      integrationId: id,
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.substring(0, 10) + '...',
      sandbox: SQUARE_API_BASE.includes('sandbox'),
    });

    // Build Square API request
    let locationIds = searchParams.getAll('location_ids');
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit');
    const queryParam = searchParams.get('query');

    const requestBody: any = {};
    
    // If no location_ids provided, try to get from integration config
    if (locationIds.length === 0) {
      const configLocationId = integration.config?.location_id;
      if (configLocationId) {
        locationIds = [configLocationId];
      }
    }
    
    // Square requires at least one location_id for orders search
    if (locationIds.length > 0) {
      requestBody.location_ids = locationIds;
    } else {
      // If still no location_ids, return error
      return NextResponse.json(
        { error: 'Location ID is required for orders search. Please sync locations first or specify location_ids in the query.' },
        { status: 400 }
      );
    }
    
    if (queryParam) {
      try {
        const query = JSON.parse(queryParam);
        // Convert date strings to ISO 8601 timestamps
        if (query.filter?.date_time_filter?.created_at) {
          const dateFilter = query.filter.date_time_filter.created_at;
          if (dateFilter.start_at && !dateFilter.start_at.includes('T')) {
            dateFilter.start_at = `${dateFilter.start_at}T00:00:00Z`;
          }
          if (dateFilter.end_at && !dateFilter.end_at.includes('T')) {
            // Set end date to end of day
            dateFilter.end_at = `${dateFilter.end_at}T23:59:59Z`;
          }
        }
        requestBody.query = query;
      } catch (e) {
        console.error('Invalid query JSON:', e);
        // Invalid JSON, ignore
      }
    }
    
    if (limit) {
      requestBody.limit = parseInt(limit, 10);
    }
    
    if (cursor) {
      requestBody.cursor = cursor;
    }

    const response = await fetch(`${SQUARE_API_BASE}/v2/orders/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      console.error('[Square Orders] API Error:', {
        status: response.status,
        statusText: response.statusText,
        details: JSON.stringify(errorDetails, null, 2),
        requestBody: JSON.stringify(requestBody, null, 2),
        apiBase: SQUARE_API_BASE,
        hasToken: !!accessToken,
        tokenLength: accessToken?.length,
      });
      return NextResponse.json(
        { error: `Square API error: ${response.statusText}`, details: errorDetails },
        { status: response.status }
      );
    }

    const data: SquareListOrdersResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Square orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}

