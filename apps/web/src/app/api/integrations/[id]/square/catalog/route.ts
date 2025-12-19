// Square Catalog Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SquareListCatalogResponse } from '@kit/types';
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

    console.log('[Square Catalog] Using access token:', {
      integrationId: id,
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.substring(0, 10) + '...',
      sandbox: SQUARE_API_BASE.includes('sandbox'),
    });

    // Build request body
    const types = searchParams.getAll('types');
    const cursor = searchParams.get('cursor');
    const catalogVersion = searchParams.get('catalog_version');

    const requestBody: any = {};
    
    if (types.length > 0) {
      requestBody.types = types;
    }
    
    if (cursor) {
      requestBody.cursor = cursor;
    }
    
    if (catalogVersion) {
      requestBody.catalog_version = parseInt(catalogVersion, 10);
    }

    const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({ object_types: types.length > 0 ? types : undefined, ...requestBody }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Square Catalog] API Error:', {
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        apiBase: SQUARE_API_BASE,
        hasToken: !!accessToken,
        tokenLength: accessToken?.length,
      });
      return NextResponse.json(
        { error: `Square API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data: SquareListCatalogResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Square catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog', details: error.message },
      { status: 500 }
    );
  }
}

