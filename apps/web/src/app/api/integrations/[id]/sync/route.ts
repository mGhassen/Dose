// Integration Sync Route – Phase 1 only: fetch from Square, write to staging, create job, return 202

import { after, NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  type FullSyncPeriod,
  runStagingForJob,
} from '@/app/api/integrations/[id]/sync/sync-staging';

async function getIntegrationAndVerifyAccess(
  supabase: any,
  integrationId: string,
  token: string
): Promise<{ integration: any; error: any }> {
  const { data: { user } } = await supabase.auth.getUser(token);
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.syncBodySchema)
    );
    if (!parsed.success) return parsed.response;
    const syncType = parsed.data.sync_type || 'full';
    const period: FullSyncPeriod | undefined = parsed.data.period_mode
      ? {
          mode: parsed.data.period_mode,
          startAt: parsed.data.start_at,
          endAt: parsed.data.end_at,
        }
      : undefined;
    if (period?.mode === 'custom') {
      if (!period.startAt || !period.endAt) {
        return NextResponse.json(
          { error: 'start_at and end_at are required for custom period' },
          { status: 400 }
        );
      }
      if (new Date(period.startAt) > new Date(period.endAt)) {
        return NextResponse.json(
          { error: 'start_at must be before or equal to end_at' },
          { status: 400 }
        );
      }
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = supabaseServer();
    const { integration, error: accessError } = await getIntegrationAndVerifyAccess(supabase, id, token);
    if (accessError) {
      return NextResponse.json(
        { error: accessError.message },
        { status: accessError.status }
      );
    }
    if (integration.status !== 'connected') {
      return NextResponse.json({ error: 'Integration is not connected' }, { status: 400 });
    }
    if (integration.integration_type === 'csv_bank') {
      return NextResponse.json(
        { error: 'CSV bank integration does not support sync. Use the file import endpoint.' },
        { status: 400 }
      );
    }
    if (!integration.access_token) {
      return NextResponse.json(
        { error: 'Access token not found. Please reconnect the integration.' },
        { status: 401 }
      );
    }

    const { data: jobRow, error: jobErr } = await supabase
      .from('sync_jobs')
      .insert({
        integration_id: integration.id,
        sync_type: syncType,
        /** Until Square/Pennylane staging finishes, cron must not process (would import 0 rows). */
        status: 'staging',
        stats: {},
      })
      .select('id')
      .single();
    if (jobErr) {
      console.error('[Sync] Failed to create sync job:', jobErr);
      return NextResponse.json(
        { error: 'Failed to create sync job', details: jobErr.message },
        { status: 500 }
      );
    }
    const jobId = jobRow.id;

    const isPennylane = integration.integration_type === 'pennylane';
    const effectiveSyncType = isPennylane ? (syncType === 'full' ? 'transactions' : syncType) : syncType;
    if (isPennylane && effectiveSyncType !== 'transactions') {
      await supabase.from('sync_jobs').delete().eq('id', jobId);
      return NextResponse.json(
        { error: 'Pennylane sync only supports sync_type: "transactions" or "full"' },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;

    after(async () => {
      const supabaseBg = supabaseServer();
      await runStagingForJob(supabaseBg, integration, jobId, syncType, origin, period);
    });

    return NextResponse.json(
      { job_id: jobId, message: 'Sync started. Processing in background.' },
      { status: 202 }
    );
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
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = supabaseServer();
    const { integration, error: accessError } = await getIntegrationAndVerifyAccess(supabase, id, token);
    if (accessError) {
      return NextResponse.json(
        { error: accessError.message },
        { status: accessError.status }
      );
    }
    const { data: jobs } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('integration_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
    return NextResponse.json(jobs || []);
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status', details: error.message },
      { status: 500 }
    );
  }
}
