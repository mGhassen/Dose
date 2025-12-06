// Square Order by ID Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SquareOrder } from '@kit/types';

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
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const { id, orderId } = await params;
    const supabase = createServerSupabaseClient();
    
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

    const response = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
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
    
    return NextResponse.json(data.order as SquareOrder);
  } catch (error: any) {
    console.error('Error fetching Square order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order', details: error.message },
      { status: 500 }
    );
  }
}

