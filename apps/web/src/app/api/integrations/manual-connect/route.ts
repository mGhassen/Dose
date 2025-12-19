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
    
    // Trim whitespace from token
    const cleanAccessToken = access_token?.trim();
    
    console.log('[Manual Connect] Received token:', {
      originalLength: access_token?.length || 0,
      cleanedLength: cleanAccessToken?.length || 0,
      tokenPrefix: cleanAccessToken?.substring(0, 15) + '...' || 'N/A',
      hasWhitespace: cleanAccessToken !== access_token,
    });

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
      const updateData: any = {
        access_token: cleanAccessToken,
        status: 'connected',
        is_active: true,
        config: {
          ...(existing.config || {}),
          merchant_id: merchant_id || existing.config?.merchant_id,
          location_id: location_id || existing.config?.location_id,
        },
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };
      
      console.log('[Manual Connect] Updating integration with data:', {
        id: existing.id,
        status: updateData.status,
        is_active: updateData.is_active,
        hasAccessToken: !!updateData.access_token,
        accessTokenLength: updateData.access_token?.length || 0,
        accessTokenPrefix: updateData.access_token?.substring(0, 10) + '...' || 'N/A',
      });
      
      const { data, error } = await supabase
        .from('integrations')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[Manual Connect] Update error:', error);
        throw error;
      }
      integration = data;
      console.log('[Manual Connect] Updated integration:', {
        id: integration.id,
        hasAccessToken: !!integration.access_token,
        accessTokenLength: integration.access_token?.length || 0,
        accessTokenPrefix: integration.access_token?.substring(0, 10) + '...' || 'N/A',
        is_active: integration.is_active,
      });
    } else {
      // Create new integration
      const insertData = {
        account_id: account.id,
        integration_type: integration_type,
        name: integration_type === 'square' ? 'Square POS' : `${integration_type} Integration`,
        status: 'connected',
        access_token: cleanAccessToken,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        config: {
          merchant_id: merchant_id,
          location_id: location_id,
        },
        is_active: true,
      };
      
      console.log('[Manual Connect] Inserting integration with data:', {
        account_id: insertData.account_id,
        integration_type: insertData.integration_type,
        status: insertData.status,
        is_active: insertData.is_active,
        hasAccessToken: !!insertData.access_token,
        accessTokenLength: insertData.access_token?.length || 0,
        accessTokenPrefix: insertData.access_token?.substring(0, 10) + '...' || 'N/A',
      });
      
      const { data, error } = await supabase
        .from('integrations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[Manual Connect] Insert error:', error);
        throw error;
      }
      integration = data;
      console.log('[Manual Connect] Created integration:', {
        id: integration.id,
        accountId: account.id,
        hasAccessToken: !!integration.access_token,
        accessTokenLength: integration.access_token?.length || 0,
        accessTokenPrefix: integration.access_token?.substring(0, 10) + '...' || 'N/A',
        is_active: integration.is_active,
      });
    }

    // Verify the integration was saved correctly
    const { data: verifyIntegration, error: verifyError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integration.id)
      .single();
    
    if (verifyError) {
      console.error('[Manual Connect] Verification error:', verifyError);
    } else {
      console.log('[Manual Connect] Verified integration in DB:', {
        id: verifyIntegration.id,
        status: verifyIntegration.status,
        is_active: verifyIntegration.is_active,
      });
      
      // If is_active is still false, force update it
      if (verifyIntegration.is_active === false) {
        console.warn('[Manual Connect] is_active is false, forcing update to true');
        await supabase
          .from('integrations')
          .update({ is_active: true })
          .eq('id', integration.id);
      }
    }

    console.log('[Manual Connect] Returning integration:', {
      id: integration.id,
      type: integration.integration_type,
      status: integration.status,
      is_active: integration.is_active,
    });

    return NextResponse.json(transformIntegration(integration));
  } catch (error: any) {
    console.error('Error manually connecting integration:', error);
    return NextResponse.json(
      { error: 'Failed to connect integration', details: error.message },
      { status: 500 }
    );
  }
}



