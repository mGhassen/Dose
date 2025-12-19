// Shared utilities for Square API routes

import { createServerSupabaseClient } from '@kit/lib/supabase';

const SQUARE_APP_ID = process.env.SQUARE_APPLICATION_ID;
const SQUARE_APP_SECRET = process.env.SQUARE_APPLICATION_SECRET;
const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';

export interface IntegrationWithToken {
  integration: any;
  accessToken: string;
  error: null;
}

export interface IntegrationError {
  integration: null;
  accessToken: null;
  error: { status: number; message: string };
}

export type IntegrationResult = IntegrationWithToken | IntegrationError;

/**
 * Gets integration and ensures access token is valid (refreshes if expired)
 */
export async function getIntegrationWithValidToken(
  supabase: any,
  integrationId: string,
  authHeader: string | null
): Promise<IntegrationResult> {
  // First, get the integration
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { integration: null, accessToken: null, error: { status: 401, message: 'Unauthorized' } };
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!account) {
    return { integration: null, accessToken: null, error: { status: 404, message: 'Account not found' } };
  }

  const { data: integration, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('account_id', account.id)
    .eq('integration_type', 'square')
    .single();

  if (error) {
    return { integration: null, accessToken: null, error: { status: 404, message: 'Square integration not found' } };
  }

  if (integration.status !== 'connected') {
    return { integration: null, accessToken: null, error: { status: 400, message: 'Integration is not connected' } };
  }

  if (!integration.access_token) {
    return { integration: null, accessToken: null, error: { status: 401, message: 'Access token not found. Please reconnect the integration.' } };
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const now = new Date();
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const needsRefresh = !expiresAt || expiresAt <= fiveMinutesFromNow;

  if (needsRefresh) {
    if (!integration.refresh_token) {
      // Manual connections don't have refresh tokens
      // Check if token is actually expired or just invalid
      const isExpired = expiresAt && expiresAt < now;
      const errorMsg = isExpired 
        ? 'Token expired and no refresh token available. Please reconnect the integration with a fresh token.'
        : 'Token is invalid or expired. Please reconnect the integration with a fresh token from Square Developer Console.';
      return { integration: null, accessToken: null, error: { status: 401, message: errorMsg } };
    }

    // Refresh the token
    const refreshResult = await refreshSquareToken(integration, authHeader);
    if (refreshResult.error) {
      return refreshResult;
    }

    // Return the refreshed integration
    return {
      integration: refreshResult.integration!,
      accessToken: refreshResult.accessToken!,
      error: null,
    };
  }

  // Token is still valid (not expired), but might still be invalid if revoked
  // We'll let the API call fail and handle it there
  return {
    integration,
    accessToken: integration.access_token,
    error: null,
  };
}

/**
 * Refreshes a Square access token
 */
async function refreshSquareToken(
  integration: any,
  authHeader: string | null
): Promise<IntegrationResult> {
  const squareTokenEndpoint = SQUARE_USE_SANDBOX
    ? 'https://connect.squareupsandbox.com/oauth2/token'
    : 'https://connect.squareup.com/oauth2/token';

  try {
    const response = await fetch(squareTokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        client_secret: SQUARE_APP_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Square Token Refresh] Failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return {
        integration: null,
        accessToken: null,
        error: {
          status: response.status,
          message: `Failed to refresh token: ${response.statusText}. Please reconnect the integration.`,
        },
      };
    }

    const data = await response.json();

    // Handle expires_at - Square API returns it as ISO 8601 timestamp string
    // But some versions might return it as seconds, so handle both
    let expiresAt: string;
    if (data.expires_at) {
      if (typeof data.expires_at === 'string') {
        // ISO 8601 timestamp string
        expiresAt = new Date(data.expires_at).toISOString();
      } else if (typeof data.expires_at === 'number') {
        // Seconds since epoch
        expiresAt = new Date(data.expires_at * 1000).toISOString();
      } else {
        // Fallback to 30 days from now
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    } else {
      // Default to 30 days from now if not provided
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Update the integration in the database
    const supabase = createServerSupabaseClient(authHeader);
    const { data: updatedIntegration, error: updateError } = await supabase
      .from('integrations')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token || integration.refresh_token, // Keep old if not provided
        token_expires_at: expiresAt,
        status: 'connected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Square Token Refresh] Database update failed:', updateError);
      // Still return the new token even if DB update fails
      return {
        integration: { ...integration, access_token: data.access_token },
        accessToken: data.access_token,
        error: null,
      };
    }

    console.log('[Square Token Refresh] Successfully refreshed token for integration:', integration.id);

    return {
      integration: updatedIntegration,
      accessToken: data.access_token,
      error: null,
    };
  } catch (error: any) {
    console.error('[Square Token Refresh] Error:', error);
    return {
      integration: null,
      accessToken: null,
      error: {
        status: 500,
        message: `Failed to refresh token: ${error.message}`,
      },
    };
  }
}

