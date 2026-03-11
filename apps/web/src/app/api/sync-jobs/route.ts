import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const integrationId = searchParams.get('integration_id');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const offset = Number(searchParams.get('offset')) || 0;

    let query = supabase
      .from('sync_jobs')
      .select(`
        *,
        integrations:integration_id (id, name, integration_type)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: integrations } = await supabase
      .from('integrations')
      .select('id')
      .eq('account_id', account.id);
    const integrationIds = (integrations || []).map((r: any) => r.id);
    if (integrationIds.length === 0) {
      return NextResponse.json({ jobs: [] });
    }
    query = query.in('integration_id', integrationIds);

    if (status) query = query.eq('status', status);
    if (integrationId) query = query.eq('integration_id', integrationId);

    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobs = (rows || []).map((row: any) => {
      const { integrations: integ, ...job } = row;
      const integration = Array.isArray(integ) ? integ[0] : integ;
      return {
        ...job,
        integration_name: integration?.name,
        integration_type: integration?.integration_type,
      };
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Error listing sync jobs:', error);
    return NextResponse.json(
      { error: 'Failed to list sync jobs', details: error.message },
      { status: 500 }
    );
  }
}
