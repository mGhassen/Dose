// Square Locations Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { SquareListLocationsResponse } from '@kit/types';
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
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const supabase = supabaseServer();
    
    const result = await getIntegrationWithValidToken(supabase, id, authHeader);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.status }
      );
    }

    const { accessToken } = result;

    // Trim any whitespace that might have been added
    const cleanToken = accessToken.trim();
    
    const squareAuthHeader = `Bearer ${cleanToken}`;

    const response = await fetch(`${SQUARE_API_BASE}/v2/locations`, {
      headers: {
        'Authorization': squareAuthHeader,
        'Square-Version': '2024-01-18',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      const errorCode = errorDetails?.errors?.[0]?.code;
      const errorCategory = errorDetails?.errors?.[0]?.category;
      const errorDetail = errorDetails?.errors?.[0]?.detail;
      
      console.error('[Square Locations] API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorCode,
        errorCategory,
        errorDetail,
        fullError: JSON.stringify(errorDetails, null, 2),
        apiBase: SQUARE_API_BASE,
        hasToken: !!accessToken,
        tokenLength: accessToken?.length,
      });
      
      // Provide clearer error message for authentication errors
      let errorMsg = errorDetail || errorCode || response.statusText;
      if (response.status === 401 && (errorCode === 'UNAUTHORIZED' || errorCategory === 'AUTHENTICATION_ERROR')) {
        errorMsg = 'Access token is invalid or expired. Please reconnect the integration with a fresh token from Square Developer Console.';
      }
      
      return NextResponse.json(
        { error: `Square API error: ${errorMsg}`, details: errorDetails },
        { status: response.status }
      );
    }

    const data: SquareListLocationsResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Square locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations', details: error.message },
      { status: 500 }
    );
  }
}

