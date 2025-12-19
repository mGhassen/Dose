// Integration Sync Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { IntegrationSyncData } from '@kit/types';

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
    .single();

  if (error) {
    return { integration: null, error: { status: 404, message: 'Integration not found' } };
  }

  return { integration, error: null };
}

async function syncSquareIntegration(
  integration: any,
  syncType: 'orders' | 'payments' | 'catalog' | 'locations' | 'full'
): Promise<{ records_synced: number; records_failed: number; error?: string }> {
  const accessToken = integration.access_token; // Should be decrypted in production
  
  if (!accessToken) {
    console.error('[Sync] Access token not found for integration:', integration.id);
    throw new Error('Access token not found. Please reconnect the integration.');
  }

  console.log('[Sync] Starting sync for integration:', {
    integrationId: integration.id,
    syncType,
    hasAccessToken: !!accessToken,
    tokenLength: accessToken.length,
    tokenPrefix: accessToken.substring(0, 10) + '...',
    sandbox: SQUARE_API_BASE.includes('sandbox'),
  });

  let recordsSynced = 0;
  let recordsFailed = 0;
  let error: string | undefined;

  try {
    if (syncType === 'locations' || syncType === 'full') {
      // Fetch locations
      const locationsResponse = await fetch(`${SQUARE_API_BASE}/v2/locations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2024-01-18',
        },
      });
      
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        recordsSynced += locationsData.locations?.length || 0;
        console.log('[Sync] Successfully fetched locations:', recordsSynced);
      } else {
        const errorText = await locationsResponse.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }
        recordsFailed++;
        const errorMsg = errorDetails?.errors?.[0]?.detail || locationsResponse.statusText || 'Unknown error';
        error = `Failed to fetch locations: ${errorMsg}`;
        console.error('[Sync] Failed to fetch locations:', {
          status: locationsResponse.status,
          statusText: locationsResponse.statusText,
          details: errorDetails,
          apiBase: SQUARE_API_BASE,
          errorCode: errorDetails?.errors?.[0]?.code,
          errorCategory: errorDetails?.errors?.[0]?.category,
          errorDetail: errorDetails?.errors?.[0]?.detail,
          fullError: JSON.stringify(errorDetails, null, 2),
        });
      }
    }

    return { records_synced: recordsSynced, records_failed: recordsFailed, error };
  } catch (err: any) {
    error = err.message || 'Unknown error occurred during sync';
    console.error('[Sync] Error during sync:', {
      error: err.message,
      stack: err.stack,
      integrationId: integration.id,
    });
    return { records_synced: recordsSynced, records_failed: recordsFailed, error };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const syncType = body.sync_type || 'full';

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

    if (integration.status !== 'connected') {
      return NextResponse.json(
        { error: 'Integration is not connected' },
        { status: 400 }
      );
    }

    // Verify access token exists
    if (!integration.access_token) {
      console.error('[Sync] Integration has no access token:', {
        integrationId: id,
        status: integration.status,
        is_active: integration.is_active,
      });
      return NextResponse.json(
        { error: 'Access token not found. Please reconnect the integration.' },
        { status: 401 }
      );
    }

    // Update sync status to in_progress
    await supabase
      .from('integrations')
      .update({
        last_sync_status: 'in_progress',
        last_sync_error: null,
      })
      .eq('id', id);

    const startedAt = new Date().toISOString();

    // Perform sync based on integration type
    let syncResult;
    if (integration.integration_type === 'square') {
      syncResult = await syncSquareIntegration(integration, syncType);
    } else {
      return NextResponse.json(
        { error: `Sync not implemented for integration type: ${integration.integration_type}` },
        { status: 501 }
      );
    }

    const completedAt = new Date().toISOString();
    const syncStatus: IntegrationSyncData = {
      integration_id: integration.id,
      sync_type: syncType,
      status: syncResult.error ? 'error' : 'success',
      records_synced: syncResult.records_synced,
      records_failed: syncResult.records_failed,
      started_at: startedAt,
      completed_at: completedAt,
      error: syncResult.error,
    };

    // Update integration with sync results
    await supabase
      .from('integrations')
      .update({
        last_sync_at: completedAt,
        last_sync_status: syncStatus.status,
        last_sync_error: syncResult.error || null,
      })
      .eq('id', id);

    return NextResponse.json(syncStatus);
  } catch (error: any) {
    console.error('Error syncing integration:', error);
    return NextResponse.json(
      { error: 'Failed to sync integration', details: error.message },
      { status: 500 }
    );
  }
}

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

    const supabase = createServerSupabaseClient(authHeader);
    
    const { integration, error: accessError } = await getIntegrationAndVerifyAccess(supabase, id);
    
    if (accessError) {
      return NextResponse.json(
        { error: accessError.message },
        { status: accessError.status }
      );
    }

    if (!integration.last_sync_at) {
      return NextResponse.json(null);
    }

    const syncStatus: IntegrationSyncData = {
      integration_id: integration.id,
      sync_type: 'full', // Default, could be stored separately
      status: integration.last_sync_status || 'success',
      records_synced: 0, // Could be stored separately
      records_failed: 0, // Could be stored separately
      started_at: integration.last_sync_at,
      completed_at: integration.last_sync_at,
      error: integration.last_sync_error || undefined,
    };

    return NextResponse.json(syncStatus);
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status', details: error.message },
      { status: 500 }
    );
  }
}

