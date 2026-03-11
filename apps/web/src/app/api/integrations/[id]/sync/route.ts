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

async function fetchAndStageSquare(
  supabase: any,
  integration: any,
  jobId: number,
  syncType: string
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

  if (syncType === 'catalog' || syncType === 'full') {
    const catalogTypes = ['ITEM', 'ITEM_VARIATION', 'CATEGORY', 'MODIFIER', 'MODIFIER_LIST', 'TAX'];
    let catalogCursor: string | null = null;
    do {
      const catalogResponse = await fetch(`${SQUARE_API_BASE}/v2/catalog/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ object_types: catalogTypes, cursor: catalogCursor || undefined }),
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
      const catalogData = await catalogResponse.json();
      const objects = catalogData.objects || [];
      catalogCursor = catalogData.cursor || null;
      if (objects.length > 0) {
        const { error: insertErr } = await supabase.from('sync_square_data').insert({
          job_id: jobId,
          data_type: 'catalog_batch',
          source_id: '',
          payload: objects,
        });
        if (insertErr) return { error: `Failed to stage catalog: ${insertErr.message}` };
        stats.catalog_batches += 1;
      }
    } while (catalogCursor);
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
    const startDate = new Date(now.getFullYear() - 2, 0, 1);
    const ranges = getMonthlyDateRanges(startDate, now);

    for (const range of ranges) {
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
        for (const order of orders) {
          const { error: insertErr } = await supabase.from('sync_square_data').insert({
            job_id: jobId,
            data_type: 'order',
            source_id: order.id || '',
            payload: order,
          });
          if (insertErr) return { error: `Failed to stage order: ${insertErr.message}` };
          stats.orders_fetched += 1;
        }
      } while (ordersCursor);
    }
  }

  if (syncType === 'payments' || syncType === 'full') {
    let paymentsCursor: string | null = null;
    do {
      const payUrl = `${SQUARE_API_BASE}/v2/payments${paymentsCursor ? `?cursor=${paymentsCursor}` : ''}`;
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
      for (const payment of payments) {
        const { error: insertErr } = await supabase.from('sync_square_data').insert({
          job_id: jobId,
          data_type: 'payment',
          source_id: payment.id || '',
          payload: payment,
        });
        if (insertErr) return { error: `Failed to stage payment: ${insertErr.message}` };
        stats.payments_fetched += 1;
      }
    } while (paymentsCursor);
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

    const result = await fetchAndStageSquare(supabase, integration, jobId, syncType);

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
