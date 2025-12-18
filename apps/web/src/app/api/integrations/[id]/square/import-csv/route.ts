// Square CSV Import Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { import_type, data } = body;

    if (!import_type || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Missing required fields: import_type, data' },
        { status: 400 }
      );
    }

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

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Import data based on type
    // For now, we'll just validate and return success
    // In production, you'd want to actually store this data in your database
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Validate row based on import type
        if (import_type === 'orders') {
          if (!row.id || !row.created_at) {
            throw new Error(`Row ${i + 1}: Missing required fields (id, created_at)`);
          }
        } else if (import_type === 'payments') {
          if (!row.id || !row.created_at || !row.amount) {
            throw new Error(`Row ${i + 1}: Missing required fields (id, created_at, amount)`);
          }
        } else if (import_type === 'catalog') {
          if (!row.id || !row.type || !row.name) {
            throw new Error(`Row ${i + 1}: Missing required fields (id, type, name)`);
          }
        }
        
        // TODO: Actually import the data into your database
        // For now, we'll just count it as successful
        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(error.message || `Row ${i + 1}: Invalid data`);
      }
    }

    return NextResponse.json({
      success: successCount,
      errors: errorCount,
      error_details: errors.slice(0, 10), // Limit to first 10 errors
    });
  } catch (error: any) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV', details: error.message },
      { status: 500 }
    );
  }
}



