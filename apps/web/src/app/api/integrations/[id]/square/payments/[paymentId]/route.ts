// Square Payment by ID Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SquarePayment } from '@kit/types';
import { getIntegrationWithValidToken } from '../../_utils';

const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';
const SQUARE_API_BASE = SQUARE_USE_SANDBOX 
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const { id, paymentId } = await params;
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

    const response = await fetch(`${SQUARE_API_BASE}/v2/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Square API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data.payment as SquarePayment);
  } catch (error: any) {
    console.error('Error fetching Square payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment', details: error.message },
      { status: 500 }
    );
  }
}

