// Integration Sync Route – Phase 1 only: fetch from Square, write to staging, create job, return 202

import { after, NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseServer } from '@kit/lib/supabase';
import {
  type FullSyncPeriod,
  runStagingForJob,
} from '@/app/api/integrations/[id]/sync/sync-staging';
import {
  getMonthlyRangesForSyncPeriod,
  periodToStats,
  stagingOptionsFromStats,
} from '@/lib/sync-period-utils';
import { enrichJobsWithLatestSuccessor } from '@/lib/sync-job-recovery';

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

function buildJobStats(
  base: Record<string, unknown>,
  period?: FullSyncPeriod
): Record<string, unknown> {
  const stats: Record<string, unknown> = { ...base };
  if (period) {
    stats.sync_period = periodToStats(period);
  }
  return stats;
}

async function createSyncJob(
  supabase: any,
  integrationId: number,
  syncType: string,
  stats: Record<string, unknown>
): Promise<{ id: number } | { error: string }> {
  const { data, error } = await supabase
    .from('sync_jobs')
    .insert({
      integration_id: integrationId,
      sync_type: syncType,
      status: 'staging',
      stats,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { error: error?.message || 'Failed to create sync job' };
  }
  return { id: data.id as number };
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
    const fragmentByMonth = parsed.data.fragment_by_month === true;
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

    const isPennylane = integration.integration_type === 'pennylane';
    const effectiveSyncType = isPennylane ? (syncType === 'full' ? 'transactions' : syncType) : syncType;
    if (isPennylane && effectiveSyncType !== 'transactions') {
      return NextResponse.json(
        { error: 'Pennylane sync only supports sync_type: "transactions" or "full"' },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;
    const monthlyRanges =
      syncType === 'full' && !isPennylane
        ? getMonthlyRangesForSyncPeriod(integration, period)
        : [];

    if (
      fragmentByMonth &&
      syncType === 'full' &&
      !isPennylane &&
      monthlyRanges.length > 1
    ) {
      const batchId = randomUUID();
      const jobIds: number[] = [];

      const catalogStats = buildJobStats(
        { batch_id: batchId, batch_role: 'catalog' },
        undefined
      );
      const catalogJob = await createSyncJob(supabase, integration.id, 'catalog', catalogStats);
      if ('error' in catalogJob) {
        return NextResponse.json({ error: catalogJob.error }, { status: 500 });
      }
      jobIds.push(catalogJob.id);

      for (let i = 0; i < monthlyRanges.length; i++) {
        const range = monthlyRanges[i];
        const monthPeriod: FullSyncPeriod = {
          mode: 'custom',
          startAt: range.startAt,
          endAt: range.endAt,
        };
        const dataStats = buildJobStats(
          {
            batch_id: batchId,
            batch_role: 'data',
            batch_index: i,
            batch_total: monthlyRanges.length,
            month_label: range.monthLabel,
            include_catalog: false,
            include_locations: false,
          },
          monthPeriod
        );
        const dataJob = await createSyncJob(supabase, integration.id, 'full', dataStats);
        if ('error' in dataJob) {
          return NextResponse.json({ error: dataJob.error }, { status: 500 });
        }
        jobIds.push(dataJob.id);
      }

      after(async () => {
        const supabaseBg = supabaseServer();
        await runStagingForJob(
          supabaseBg,
          integration,
          catalogJob.id,
          'catalog',
          origin,
          undefined,
          undefined,
          {},
          catalogStats
        );
        for (let i = 0; i < monthlyRanges.length; i++) {
          const range = monthlyRanges[i];
          const dataJobId = jobIds[i + 1];
          const monthPeriod: FullSyncPeriod = {
            mode: 'custom',
            startAt: range.startAt,
            endAt: range.endAt,
          };
          const dataStats = buildJobStats(
            {
              batch_id: batchId,
              batch_role: 'data',
              batch_index: i,
              batch_total: monthlyRanges.length,
              month_label: range.monthLabel,
              include_catalog: false,
              include_locations: false,
            },
            monthPeriod
          );
          await runStagingForJob(
            supabaseBg,
            integration,
            dataJobId,
            'full',
            origin,
            monthPeriod,
            undefined,
            stagingOptionsFromStats(dataStats),
            dataStats
          );
        }
      });

      return NextResponse.json(
        {
          job_id: jobIds[0],
          job_ids: jobIds,
          batch_id: batchId,
          message: `Started batch of ${jobIds.length} jobs (1 catalog + ${monthlyRanges.length} monthly data jobs).`,
        },
        { status: 202 }
      );
    }

    const singleStats = buildJobStats({}, period);
    const singleJob = await createSyncJob(supabase, integration.id, syncType, singleStats);
    if ('error' in singleJob) {
      return NextResponse.json({ error: singleJob.error }, { status: 500 });
    }

    after(async () => {
      const supabaseBg = supabaseServer();
      await runStagingForJob(
        supabaseBg,
        integration,
        singleJob.id,
        syncType,
        origin,
        period,
        undefined,
        stagingOptionsFromStats(singleStats),
        singleStats
      );
    });

    return NextResponse.json(
      { job_id: singleJob.id, message: 'Sync started. Processing in background.' },
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
    const enriched = await enrichJobsWithLatestSuccessor(supabase, jobs || []);
    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status', details: error.message },
      { status: 500 }
    );
  }
}
