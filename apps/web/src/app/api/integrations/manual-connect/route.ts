// Manual Connect Route (for testing with sandbox tokens)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Integration } from '@kit/types';

function transformIntegration(row: any): Integration {
  return {
    id: row.id,
    account_id: row.account_id,
    integration_type: row.integration_type,
    name: row.name,
    status: row.status,
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    token_expires_at: row.token_expires_at,
    config: row.config || {},
    last_sync_at: row.last_sync_at,
    last_sync_status: row.last_sync_status,
    last_sync_error: row.last_sync_error,
    sync_frequency: row.sync_frequency,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { integration_type, access_token, merchant_id, location_id } = body;

    if (!integration_type || !access_token) {
      return NextResponse.json(
        { error: 'Missing required fields: integration_type, access_token' },
        { status: 400 }
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

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('*')
      .eq('account_id', account.id)
      .eq('integration_type', integration_type)
      .single();

    let integration;
    if (existing) {
      // Update existing integration
      const { data, error } = await supabase
        .from('integrations')
        .update({
          access_token: access_token,
          status: 'connected',
          config: {
            ...(existing.config || {}),
            merchant_id: merchant_id || existing.config?.merchant_id,
            location_id: location_id || existing.config?.location_id,
          },
          token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      integration = data;
    } else {
      // Create new integration
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          account_id: account.id,
          integration_type: integration_type,
          name: integration_type === 'square' ? 'Square POS' : `${integration_type} Integration`,
          status: 'connected',
          access_token: access_token,
          token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          config: {
            merchant_id: merchant_id,
            location_id: location_id,
          },
        })
        .select()
        .single();

      if (error) throw error;
      integration = data;
    }

    return NextResponse.json(transformIntegration(integration));
  } catch (error: any) {
    console.error('Error manually connecting integration:', error);
    return NextResponse.json(
      { error: 'Failed to connect integration', details: error.message },
      { status: 500 }
    );
  }
}



