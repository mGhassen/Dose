// Square Orders Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SquareListOrdersResponse } from '@kit/types';

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

    // Build Square API request
    const locationIds = searchParams.getAll('location_ids');
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit');
    const queryParam = searchParams.get('query');

    const requestBody: any = {};
    
    if (locationIds.length > 0) {
      requestBody.location_ids = locationIds;
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
        console.log('Orders request body:', JSON.stringify(requestBody, null, 2));
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
      console.error('Square Orders API Error:', {
        status: response.status,
        statusText: response.statusText,
        details: JSON.stringify(errorDetails, null, 2),
        requestBody: JSON.stringify(requestBody, null, 2),
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

