// Integration Sync Route – Phase 1 only: fetch from Square, write to staging, create job, return 202

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';
const SQUARE_API_BASE = SQUARE_USE_SANDBOX
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';

function getMonthlyDateRanges(start: Date, end: Date): { startAt: string; endAt: string }[] {
  const ranges: { startAt: string; endAt: string }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  while (cur <= end) {
    const chunkEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
    const rangeEnd = chunkEnd > end ? end : chunkEnd;
    ranges.push({
      startAt: new Date(cur).toISOString(),
      endAt: rangeEnd.toISOString(),
    });
    cur.setMonth(cur.getMonth() + 1);
    cur.setDate(1);
  }
  return ranges;
}

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

type FullSyncPeriod = {
  mode: 'last_sync' | 'custom' | 'all';
  startAt?: string;
  endAt?: string;
};

function resolveFullSyncRange(
  integration: any,
  period: FullSyncPeriod | undefined
): { start: Date; end: Date } {
  const now = new Date();
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const LOOKBACK_YEARS = 7;
  const mode = period?.mode ?? 'all';

  if (mode === 'custom' && period?.startAt && period?.endAt) {
    return { start: new Date(period.startAt), end: new Date(period.endAt) };
  }
  if (mode === 'last_sync' && integration.last_sync_at) {
    return { start: new Date(integration.last_sync_at), end: defaultEnd };
  }
  return { start: new Date(now.getFullYear() - LOOKBACK_YEARS, 0, 1), end: defaultEnd };
}

async function fetchAndStageSquare(
  supabase: any,
  integration: any,
  jobId: number,
  syncType: string,
  period?: FullSyncPeriod
): Promise<{ error?: string; stats?: Record<string, number> }> {
  const accessToken = integration.access_token;
  const integrationId = integration.id as number;
  if (!accessToken) {
    return { error: 'Access token not found. Please reconnect the integration.' };
  }
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Square-Version': '2024-01-18',
  };
  const stats: Record<string, number> = {
    catalog_batches: 0,
    orders_fetched: 0,
    payments_fetched: 0,
  };
  let sequence = 0;
  const insertStep = async (
    name: string,
    status: 'pending' | 'running' | 'done' | 'failed',
    details: Record<string, number> = {}
  ) => {
    sequence += 1;
    const { error } = await supabase.from('sync_job_steps').insert({
      job_id: jobId,
      sequence,
      name,
      status,
      details,
    });
    if (error) throw new Error(`sync_job_steps: ${error.message}`);
  };

  if (syncType === 'catalog' || syncType === 'full') {
    const catalogTypes = [
      'ITEM',
      'ITEM_VARIATION',
      'CATEGORY',
      'MODIFIER',
      'MODIFIER_LIST',
      'TAX',
      'MEASUREMENT_UNIT',
    ];
    let catalogCursor: string | null = null;
    do {
      const catalogResponse: Response = await fetch(`${SQUARE_API_BASE}/v2/catalog/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          object_types: catalogTypes,
          include_deleted_objects: true,
          cursor: catalogCursor || undefined,
        }),
      });
      if (!catalogResponse.ok) {
        const errorText = await catalogResponse.text();
        let errorDetails: any;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }
        return { error: `Failed to fetch catalog: ${errorDetails?.errors?.[0]?.detail || catalogResponse.statusText}` };
      }
      const catalogData: { objects?: unknown[]; cursor?: string | null } = await catalogResponse.json();
      const objects = catalogData.objects || [];
      catalogCursor = catalogData.cursor || null;
      if (objects.length > 0) {
        const rows = objects.map((obj: any) => ({
          job_id: jobId,
          data_type: 'catalog_object',
          source_id: obj.id || '',
          payload: obj,
        }));
        const { error: upsertErr } = await supabase
          .from('sync_square_data')
          .upsert(rows, { onConflict: 'job_id,data_type,source_id', ignoreDuplicates: true });
        if (upsertErr) {
          if (upsertErr.message?.includes('no unique or exclusion constraint')) {
            const { error: insertErr } = await supabase.from('sync_square_data').insert(rows);
            if (insertErr) return { error: `Failed to stage catalog: ${insertErr.message}` };
          } else {
            return { error: `Failed to stage catalog: ${upsertErr.message}` };
          }
        }
        stats.catalog_batches += 1;
        await insertStep(`Catalog — page ${stats.catalog_batches}`, 'done', { objects: objects.length });
      }
    } while (catalogCursor);
    if (stats.catalog_batches === 0) await insertStep('Fetch catalog', 'done', { objects: 0 });
  }

  let locationIds: string[] = integration.config?.location_id ? [integration.config.location_id] : [];
  if (locationIds.length === 0 && (syncType === 'orders' || syncType === 'full')) {
    const locRes = await fetch(`${SQUARE_API_BASE}/v2/locations`, { headers });
    if (locRes.ok) {
      const locData = await locRes.json();
      locationIds = (locData.locations || []).map((l: any) => l.id);
    }
  }

  if ((syncType === 'orders' || syncType === 'full') && locationIds.length > 0) {
    const now = new Date();
    let startDate: Date;
    let orderEndDate: Date;
    if (syncType === 'full') {
      const range = resolveFullSyncRange(integration, period);
      startDate = range.start;
      orderEndDate = range.end;
    } else {
      const useIncremental = integration.last_sync_at != null;
      const lastSync = useIncremental
        ? new Date(new Date(integration.last_sync_at).getTime() - 5 * 60 * 1000)
        : null;
      const ORDER_LOOKBACK_YEARS = 7;
      startDate = lastSync ?? new Date(now.getFullYear() - ORDER_LOOKBACK_YEARS, 0, 1);
      orderEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }
    const ranges = getMonthlyDateRanges(startDate, orderEndDate);
    let ordersStepAdded = false;

    for (const range of ranges) {
      const monthLabel = new Date(range.startAt).toISOString().slice(0, 7);
      let ordersPageInMonth = 0;
      let ordersCursor: string | null = null;
      do {
        const orderBody: any = {
          location_ids: locationIds,
          limit: 100,
          query: {
            filter: {
              date_time_filter: {
                created_at: {
                  start_at: range.startAt,
                  end_at: range.endAt,
                },
              },
            },
          },
          sort: { sort_field: 'CREATED_AT', sort_order: 'ASC' },
        };
        if (ordersCursor) orderBody.cursor = ordersCursor;
        const ordersResponse = await fetch(`${SQUARE_API_BASE}/v2/orders/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(orderBody),
        });
        if (!ordersResponse.ok) {
          const errText = await ordersResponse.text();
          let errDetails: any;
          try {
            errDetails = JSON.parse(errText);
          } catch {
            errDetails = errText;
          }
          return { error: `Failed to fetch orders: ${errDetails?.errors?.[0]?.detail || ordersResponse.statusText}` };
        }
        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];
        ordersCursor = ordersData.cursor || null;
        if (orders.length > 0) {
          const rows = orders.map((order: any) => ({
            job_id: jobId,
            data_type: 'order',
            source_id: order.id || '',
            payload: order,
          }));
          const { error: upsertErr } = await supabase
            .from('sync_square_data')
            .upsert(rows, { onConflict: 'job_id,data_type,source_id', ignoreDuplicates: true });
          if (upsertErr) {
            if (upsertErr.message?.includes('no unique or exclusion constraint')) {
              const { error: insertErr } = await supabase.from('sync_square_data').insert(rows);
              if (insertErr) return { error: `Failed to stage order: ${insertErr.message}` };
            } else {
              return { error: `Failed to stage order: ${upsertErr.message}` };
            }
          }
          stats.orders_fetched += orders.length;
        }
        if (orders.length > 0) {
          ordersPageInMonth += 1;
          ordersStepAdded = true;
          await insertStep(`Orders — ${monthLabel} — page ${ordersPageInMonth}`, 'done', { orders: orders.length });
        }
      } while (ordersCursor);
    }
    if (!ordersStepAdded) await insertStep('Fetch orders', 'done', { orders: 0 });
  }

  if (syncType === 'payments' || syncType === 'full') {
    const now = new Date();
    let paymentsStart: Date;
    let paymentsEnd: Date;
    if (syncType === 'full') {
      const range = resolveFullSyncRange(integration, period);
      paymentsStart = range.start;
      paymentsEnd = range.end;
    } else {
      paymentsStart = integration.last_sync_at != null
        ? new Date(integration.last_sync_at)
        : new Date(now.getFullYear() - 7, 0, 1);
      paymentsEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }
    const paymentRanges = getMonthlyDateRanges(paymentsStart, paymentsEnd);
    let paymentsStepAdded = false;

    for (const range of paymentRanges) {
      const monthLabel = new Date(range.startAt).toISOString().slice(0, 7);
      let paymentsPageInMonth = 0;
      let paymentsCursor: string | null = null;
      do {
        const payParams = new URLSearchParams();
        payParams.set('begin_time', range.startAt);
        payParams.set('end_time', range.endAt);
        if (paymentsCursor) payParams.set('cursor', paymentsCursor);
        const payUrl = `${SQUARE_API_BASE}/v2/payments?${payParams.toString()}`;
        const payResponse = await fetch(payUrl, { headers });
        if (!payResponse.ok) {
          const errText = await payResponse.text();
          let errDetails: any;
          try {
            errDetails = JSON.parse(errText);
          } catch {
            errDetails = errText;
          }
          return { error: `Failed to fetch payments: ${errDetails?.errors?.[0]?.detail || payResponse.statusText}` };
        }
        const payData = await payResponse.json();
        const payments = payData.payments || [];
        paymentsCursor = payData.cursor || null;
        if (payments.length > 0) {
          const rows = payments.map((payment: any) => ({
            job_id: jobId,
            data_type: 'payment',
            source_id: payment.id || '',
            payload: payment,
          }));
          const { error: upsertErr } = await supabase
            .from('sync_square_data')
            .upsert(rows, { onConflict: 'job_id,data_type,source_id', ignoreDuplicates: true });
          if (upsertErr) {
            if (upsertErr.message?.includes('no unique or exclusion constraint')) {
              const { error: insertErr } = await supabase.from('sync_square_data').insert(rows);
              if (insertErr) return { error: `Failed to stage payment: ${insertErr.message}` };
            } else {
              return { error: `Failed to stage payment: ${upsertErr.message}` };
            }
          }
          stats.payments_fetched += payments.length;
        }
        if (payments.length > 0) {
          paymentsPageInMonth += 1;
          paymentsStepAdded = true;
          await insertStep(`Payments — ${monthLabel} — page ${paymentsPageInMonth}`, 'done', { payments: payments.length });
        }
      } while (paymentsCursor);
    }
    if (!paymentsStepAdded) await insertStep('Fetch payments', 'done', { payments: 0 });
  }

  return { stats };
}

const PENNYLANE_API_BASE = 'https://app.pennylane.com/api/external/v2';

async function fetchAndStagePennylane(
  supabase: any,
  integration: any,
  jobId: number,
  _syncType: string
): Promise<{ error?: string; stats?: Record<string, number> }> {
  const accessToken = integration.access_token;
  if (!accessToken) {
    return { error: 'Access token not found. Please reconnect the integration.' };
  }
  const stats: Record<string, number> = { transactions_fetched: 0 };
  let sequence = 0;
  const insertStep = async (
    name: string,
    status: 'pending' | 'running' | 'done' | 'failed',
    details: Record<string, number> = {}
  ) => {
    sequence += 1;
    const { error } = await supabase.from('sync_job_steps').insert({
      job_id: jobId,
      sequence,
      name,
      status,
      details,
    });
    if (error) throw new Error(`sync_job_steps: ${error.message}`);
  };

  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${PENNYLANE_API_BASE}/transactions`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `Pennylane transactions: ${res.status} ${text}` };
    }

    const data = await res.json();
    const transactions = Array.isArray(data) ? data : data?.transactions ?? data?.data ?? [];
    if (transactions.length === 0) {
      if (page === 1) await insertStep('Fetch transactions', 'done', { transactions: 0 });
      break;
    }

    const rows = transactions.map((tx: any) => ({
      job_id: jobId,
      data_type: 'transaction',
      source_id: String(tx.id ?? tx.uuid ?? ''),
      payload: tx,
    }));
    const { error: insertErr } = await supabase.from('sync_pennylane_data').insert(rows);
    if (insertErr) return { error: `Failed to stage transactions: ${insertErr.message}` };

    stats.transactions_fetched += transactions.length;
    await insertStep(`Transactions — page ${page}`, 'done', { transactions: transactions.length });

    if (transactions.length < perPage) break;
    page += 1;
  }

  return { stats };
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
        status: 'pending',
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
      return NextResponse.json(
        { error: 'Pennylane sync only supports sync_type: "transactions" or "full"' },
        { status: 400 }
      );
    }

    const result = isPennylane
      ? await fetchAndStagePennylane(supabase, integration, jobId, effectiveSyncType)
      : await fetchAndStageSquare(supabase, integration, jobId, syncType, period);

    if (result.error) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_message: result.error,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return NextResponse.json(
        { job_id: jobId, status: 'failed', error_message: result.error },
        { status: 200 }
      );
    }

    await supabase
      .from('sync_jobs')
      .update({ stats: result.stats || {} })
      .eq('id', jobId);

    await supabase
      .from('integrations')
      .update({ last_sync_status: 'in_progress', last_sync_error: null })
      .eq('id', id);

    const origin = request.nextUrl.origin;
    const secret = process.env.CRON_SECRET;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['x-cron-secret'] = secret;
    fetch(`${origin}/api/cron/process-sync-jobs?job_id=${jobId}`, { method: 'POST', headers }).catch(() => {});

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
