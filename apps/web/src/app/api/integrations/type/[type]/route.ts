// Integration by Type API Route

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const supabase = createServerSupabaseClient();
    
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
      .eq('integration_type', type)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(null);
      }
      throw error;
    }

    return NextResponse.json(transformIntegration(data));
  } catch (error: any) {
    console.error('Error fetching integration by type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration', details: error.message },
      { status: 500 }
    );
  }
}

