// Integrations API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Integration, CreateIntegrationData } from '@kit/types';

function transformIntegration(row: any): Integration {
  return {
    id: row.id,
    account_id: row.account_id,
    integration_type: row.integration_type,
    name: row.name,
    status: row.status,
    access_token: row.access_token, // Should be decrypted in production
    refresh_token: row.refresh_token, // Should be decrypted in production
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

function transformToSnakeCase(data: CreateIntegrationData): any {
  return {
    integration_type: data.integration_type,
    name: data.name,
    config: data.config || {},
    sync_frequency: data.sync_frequency || 'manual',
  };
}

export async function GET(request: NextRequest) {
  try {
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

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/integrations] Supabase error:', error);
      throw error;
    }

    console.log('[GET /api/integrations] Found integrations:', data?.length || 0, 'for account:', account.id);
    if (data && data.length > 0) {
      console.log('[GET /api/integrations] Integration statuses:', data.map(i => ({ id: i.id, type: i.integration_type, status: i.status, is_active: i.is_active })));
    }
    
    const integrations: Integration[] = (data || []).map(transformIntegration);
    
    return NextResponse.json(integrations);
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateIntegrationData = await request.json();
    
    if (!body.integration_type || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: integration_type, name' },
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

    // Check if integration of this type already exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('account_id', account.id)
      .eq('integration_type', body.integration_type)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Integration of type '${body.integration_type}' already exists` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('integrations')
      .insert({
        ...transformToSnakeCase(body),
        account_id: account.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformIntegration(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Failed to create integration', details: error.message },
      { status: 500 }
    );
  }
}

