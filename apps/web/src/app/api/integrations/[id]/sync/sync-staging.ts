import {
  type FullSyncPeriod,
  type SquareStagingOptions,
  resolveFullSyncRange,
} from '@/lib/sync-period-utils';
import {
  BUSINESS_TIMEZONE_EUROPE_PARIS,
  endOfZonedCalendarDay,
  getDatePartsInTimeZone,
  getMonthlyZonedRanges,
  startOfZonedYearJanFirstUtc,
} from '@kit/lib/date-format';
import {
  type FetchCheckpoint,
  type FetchCoverage,
  type FetchPhase,
  type FetchProgress,
  initialCursorForMonth,
  markMonthPhaseComplete,
  shouldSkipMonth,
} from '@/lib/sync-fetch-checkpoint';
import { isFetchComplete } from '@/lib/sync-fetch-checkpoint';
import { filterKnownStagingRows } from '@/lib/sync-entity-key';

export type { FullSyncPeriod } from '@/lib/sync-period-utils';

export type StagingUpsertResult = {
  error?: string;
  inserted: number;
  skipped_duplicates: number;
  skipped_already_imported: number;
  skipped_already_processed: number;
  skipped_cross_job_active: number;
};

const SQUARE_USE_SANDBOX = process.env.SQUARE_USE_SANDBOX === 'true';
const SQUARE_API_BASE = SQUARE_USE_SANDBOX
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com';

const SYNC_TZ = BUSINESS_TIMEZONE_EUROPE_PARIS;
const PENNYLANE_API_BASE = 'https://app.pennylane.com/api/external/v2';

type SquareStagingRow = {
  job_id: number;
  data_type: string;
  source_id: string;
  payload: unknown;
  step_id?: number;
};

function isDuplicateStagingError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes('duplicate key') ||
    message.includes('idx_sync_square_data_job_type_source') ||
    message.includes('idx_sync_square_data_integration_type_source')
  );
}

async function upsertSquareStagingRows(
  supabase: { from: (t: string) => any },
  rows: SquareStagingRow[],
  label: string,
  ctx: { integrationId: number; stagingJobId: number; stepId?: number }
): Promise<StagingUpsertResult> {
  const empty: StagingUpsertResult = {
    inserted: 0,
    skipped_duplicates: 0,
    skipped_already_imported: 0,
    skipped_already_processed: 0,
    skipped_cross_job_active: 0,
  };
  if (rows.length === 0) return empty;

  const filtered = await filterKnownStagingRows(
    supabase,
    ctx.integrationId,
    ctx.stagingJobId,
    rows
  );

  const toInsert = ctx.stepId
    ? filtered.rows.map((r) => ({ ...r, step_id: ctx.stepId }))
    : filtered.rows;

  let inserted = 0;
  let skipped_duplicates = 0;

  if (toInsert.length > 0) {
    const { error: upsertErr } = await supabase
      .from('sync_square_data')
      .upsert(toInsert, { onConflict: 'job_id,data_type,source_id', ignoreDuplicates: true });

    if (!upsertErr) {
      inserted = toInsert.length;
    } else if (
      isDuplicateStagingError(upsertErr.message) ||
      upsertErr.message?.includes('no unique or exclusion constraint')
    ) {
      for (const row of toInsert) {
        const { error: insertErr } = await supabase.from('sync_square_data').insert(row);
        if (insertErr && isDuplicateStagingError(insertErr.message)) {
          skipped_duplicates += 1;
        } else if (insertErr) {
          return {
            error: `Failed to stage ${label}: ${insertErr.message}`,
            inserted,
            skipped_duplicates,
            skipped_already_imported: filtered.skipped_already_imported,
            skipped_already_processed: filtered.skipped_already_processed,
            skipped_cross_job_active: filtered.skipped_cross_job_active,
          };
        } else {
          inserted += 1;
        }
      }
    } else {
      return {
        error: `Failed to stage ${label}: ${upsertErr.message}`,
        ...empty,
        skipped_already_imported: filtered.skipped_already_imported,
        skipped_already_processed: filtered.skipped_already_processed,
        skipped_cross_job_active: filtered.skipped_cross_job_active,
      };
    }
  }

  return {
    inserted,
    skipped_duplicates,
    skipped_already_imported: filtered.skipped_already_imported,
    skipped_already_processed: filtered.skipped_already_processed,
    skipped_cross_job_active: filtered.skipped_cross_job_active,
  };
}

function stagingStepDetails(
  base: Record<string, unknown>,
  stageRes: StagingUpsertResult
): Record<string, unknown> {
  return {
    ...base,
    inserted: stageRes.inserted,
    skipped_duplicates: stageRes.skipped_duplicates,
    skipped_already_imported: stageRes.skipped_already_imported,
    skipped_already_processed: stageRes.skipped_already_processed,
    skipped_cross_job_active: stageRes.skipped_cross_job_active,
  };
}

async function verifiedCountForStep(
  supabase: { from: (t: string) => any },
  stepId: number
): Promise<number> {
  const { count } = await supabase
    .from('sync_square_data')
    .select('*', { count: 'exact', head: true })
    .eq('step_id', stepId);
  return count ?? 0;
}

async function getNextStepSequence(supabase: { from: (t: string) => any }, jobId: number): Promise<number> {
  const { data } = await supabase
    .from('sync_job_steps')
    .select('sequence')
    .eq('job_id', jobId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sequence ?? 0) + 1;
}

type StepRunner = {
  begin: (
    name: string,
    meta?: Record<string, unknown>
  ) => Promise<{ stepId: number; sequence: number }>;
  complete: (
    stepId: number,
    sequence: number,
    details: Record<string, unknown>
  ) => Promise<void>;
  fail: (stepId: number, sequence: number, details: Record<string, unknown>) => Promise<void>;
};

function createStepRunner(
  supabase: { from: (t: string) => any },
  auditJobId: number
): { runner: StepRunner; getSequence: () => number; init: () => Promise<void> } {
  let sequence = 0;

  const runner: StepRunner = {
    async begin(name, meta = {}) {
      sequence += 1;
      const seq = sequence;
      const { data, error } = await supabase
        .from('sync_job_steps')
        .insert({
          job_id: auditJobId,
          sequence: seq,
          name,
          status: 'running',
          details: meta,
        })
        .select('id')
        .single();
      if (error || !data) throw new Error(`sync_job_steps: ${error?.message ?? 'insert failed'}`);
      return { stepId: data.id as number, sequence: seq };
    },
    async complete(stepId, seq, details) {
      await supabase
        .from('sync_job_steps')
        .update({ status: 'done', details, updated_at: new Date().toISOString() })
        .eq('job_id', auditJobId)
        .eq('sequence', seq);
    },
    async fail(stepId, seq, details) {
      await supabase
        .from('sync_job_steps')
        .update({ status: 'failed', details, updated_at: new Date().toISOString() })
        .eq('job_id', auditJobId)
        .eq('sequence', seq);
    },
  };

  return {
    runner,
    getSequence: () => sequence,
    async init() {
      sequence = (await getNextStepSequence(supabase, auditJobId)) - 1;
    },
  };
}

async function persistJobStats(
  supabase: { from: (t: string) => any },
  jobId: number,
  patch: Record<string, unknown>,
  base?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const merged = { ...base, ...patch };
  await supabase.from('sync_jobs').update({ stats: merged }).eq('id', jobId);
  return merged;
}

export async function fetchAndStageSquare(
  supabase: any,
  integration: any,
  auditJobId: number,
  syncType: string,
  period?: FullSyncPeriod,
  stagingJobId: number = auditJobId,
  stagingOptions: SquareStagingOptions = {},
  checkpoint?: FetchCheckpoint,
  jobStats?: Record<string, unknown>
): Promise<{ error?: string; stats?: Record<string, unknown> }> {
  const includeCatalog = stagingOptions.includeCatalog !== false;
  const accessToken = integration.access_token;
  if (!accessToken) {
    return { error: 'Access token not found. Please reconnect the integration.' };
  }
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Square-Version': '2024-01-18',
  };
  const integrationId = integration.id as number;
  const stagingCtx = { integrationId, stagingJobId };
  const stats: Record<string, unknown> = {
    catalog_batches: 0,
    orders_fetched: 0,
    payments_fetched: 0,
    ...(jobStats ?? {}),
  };
  let coverage = (stats.fetch_coverage ?? {}) as FetchCoverage;
  const completedPhases: FetchPhase[] = [...(checkpoint?.completed_phases ?? [])];

  const stepCtx = createStepRunner(supabase, auditJobId);
  await stepCtx.init();
  const { runner } = stepCtx;

  const isResume = Boolean(checkpoint);

  const skipCatalog =
    !includeCatalog ||
    !(syncType === 'catalog' || syncType === 'full') ||
    completedPhases.includes('catalog') ||
    (checkpoint && checkpoint.phase !== 'catalog' && completedPhases.includes('catalog'));

  if (!skipCatalog && includeCatalog && (syncType === 'catalog' || syncType === 'full')) {
    const catalogTypes = [
      'ITEM',
      'ITEM_VARIATION',
      'CATEGORY',
      'MODIFIER',
      'MODIFIER_LIST',
      'TAX',
      'MEASUREMENT_UNIT',
    ];
    let catalogCursor: string | null =
      checkpoint?.phase === 'catalog' ? (checkpoint.next_cursor ?? null) : null;
    if (checkpoint?.phase !== 'catalog') catalogCursor = null;

    do {
      const { stepId, sequence } = await runner.begin(
        `Catalog — page ${Number(stats.catalog_batches) + 1}`,
        { data_type: 'catalog_object' }
      );
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
        let errorDetails: unknown;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }
        const msg = `Failed to fetch catalog: ${(errorDetails as { errors?: { detail?: string }[] })?.errors?.[0]?.detail || catalogResponse.statusText}`;
        await runner.fail(stepId, sequence, { error: msg });
        return { error: msg };
      }
      const catalogData: { objects?: unknown[]; cursor?: string | null } = await catalogResponse.json();
      const objects = catalogData.objects || [];
      catalogCursor = catalogData.cursor || null;
      const api_count = objects.length;
      let inserted = 0;
      let stageRes: StagingUpsertResult = {
        inserted: 0,
        skipped_duplicates: 0,
        skipped_already_imported: 0,
        skipped_already_processed: 0,
        skipped_cross_job_active: 0,
      };
      if (objects.length > 0) {
        const rows = objects.map((obj) => {
          const o = obj as { id?: string };
          return {
            job_id: stagingJobId,
            data_type: 'catalog_object',
            source_id: o.id || '',
            payload: obj,
          };
        });
        stageRes = await upsertSquareStagingRows(supabase, rows, 'catalog', {
          ...stagingCtx,
          stepId,
        });
        if (stageRes.error) {
          await runner.fail(stepId, sequence, { error: stageRes.error });
          return { error: stageRes.error };
        }
        inserted = stageRes.inserted;
        stats.catalog_batches = Number(stats.catalog_batches) + 1;
      }
      const verified_db_count = await verifiedCountForStep(supabase, stepId);
      await runner.complete(
        stepId,
        sequence,
        stagingStepDetails(
          {
            data_type: 'catalog_object',
            page: Number(stats.catalog_batches) || 1,
            api_count,
            verified_db_count,
            next_cursor: catalogCursor,
          },
          stageRes
        )
      );
      if (
        !isResume &&
        api_count > 0 &&
        verified_db_count < api_count &&
        stageRes.skipped_duplicates === 0 &&
        stageRes.skipped_already_imported === 0 &&
        stageRes.skipped_already_processed === 0 &&
        stageRes.skipped_cross_job_active === 0
      ) {
        return { error: `Catalog staging count mismatch: api=${api_count} verified=${verified_db_count}` };
      }
      const progress: FetchProgress = {
        phase: 'catalog',
        page: Number(stats.catalog_batches),
        next_cursor: catalogCursor,
        completed_phases: completedPhases,
      };
      stats.fetch_progress = progress;
      await persistJobStats(supabase, auditJobId, { fetch_progress: progress, catalog_batches: stats.catalog_batches }, stats);
    } while (catalogCursor);

    if (Number(stats.catalog_batches) === 0) {
      const { stepId, sequence } = await runner.begin('Fetch catalog', { data_type: 'catalog_object' });
      await runner.complete(stepId, sequence, { api_count: 0, verified_db_count: 0, next_cursor: null });
    }
    if (!completedPhases.includes('catalog')) completedPhases.push('catalog');
    stats.catalog_complete = true;
  }

  let locationIds: string[] = integration.config?.location_id ? [integration.config.location_id] : [];
  if (locationIds.length === 0 && (syncType === 'orders' || syncType === 'full')) {
    const locRes = await fetch(`${SQUARE_API_BASE}/v2/locations`, { headers });
    if (locRes.ok) {
      const locData = await locRes.json();
      locationIds = (locData.locations || []).map((l: { id: string }) => l.id);
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
      const yParis = getDatePartsInTimeZone(now, SYNC_TZ).y;
      startDate = lastSync ?? startOfZonedYearJanFirstUtc(yParis - ORDER_LOOKBACK_YEARS, SYNC_TZ);
      orderEndDate = endOfZonedCalendarDay(now, SYNC_TZ);
    }
    const ranges = getMonthlyZonedRanges(startDate, orderEndDate, SYNC_TZ);
    let ordersStepAdded = false;

    for (const range of ranges) {
      const monthLabel = new Date(range.startAt).toISOString().slice(0, 7);
      if (shouldSkipMonth(checkpoint ?? null, 'orders', monthLabel)) {
        coverage = markMonthPhaseComplete(coverage, monthLabel, 'orders');
        continue;
      }
      let ordersPageInMonth = 0;
      let ordersCursor: string | null = initialCursorForMonth(checkpoint ?? null, 'orders', monthLabel);

      do {
        const stepName = `Orders — ${monthLabel} — page ${ordersPageInMonth + 1}`;
        const { stepId, sequence } = await runner.begin(stepName, {
          data_type: 'order',
          month_label: monthLabel,
        });
        const orderBody: Record<string, unknown> = {
          location_ids: locationIds,
          limit: 100,
          query: {
            filter: {
              date_time_filter: {
                created_at: { start_at: range.startAt, end_at: range.endAt },
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
          let errDetails: unknown;
          try {
            errDetails = JSON.parse(errText);
          } catch {
            errDetails = errText;
          }
          const msg = `Failed to fetch orders: ${(errDetails as { errors?: { detail?: string }[] })?.errors?.[0]?.detail || ordersResponse.statusText}`;
          await runner.fail(stepId, sequence, { error: msg });
          return { error: msg };
        }
        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];
        ordersCursor = ordersData.cursor || null;
        const api_count = orders.length;
        let stageRes: StagingUpsertResult = {
          inserted: 0,
          skipped_duplicates: 0,
          skipped_already_imported: 0,
          skipped_already_processed: 0,
          skipped_cross_job_active: 0,
        };
        if (orders.length > 0) {
          const rows = orders.map((order: { id?: string }) => ({
            job_id: stagingJobId,
            data_type: 'order',
            source_id: order.id || '',
            payload: order,
          }));
          stageRes = await upsertSquareStagingRows(supabase, rows, 'order', {
            ...stagingCtx,
            stepId,
          });
          if (stageRes.error) {
            await runner.fail(stepId, sequence, { error: stageRes.error });
            return { error: stageRes.error };
          }
          stats.orders_fetched = Number(stats.orders_fetched) + orders.length;
        }
        if (orders.length > 0) {
          ordersPageInMonth += 1;
          ordersStepAdded = true;
        }
        const verified_db_count = await verifiedCountForStep(supabase, stepId);
        await runner.complete(
          stepId,
          sequence,
          stagingStepDetails(
            {
              data_type: 'order',
              month_label: monthLabel,
              page: ordersPageInMonth,
              api_count,
              verified_db_count,
              next_cursor: ordersCursor,
            },
            stageRes
          )
        );
        const progress: FetchProgress = {
          phase: 'orders',
          month_label: monthLabel,
          page: ordersPageInMonth,
          next_cursor: ordersCursor,
          completed_phases: completedPhases,
        };
        stats.fetch_progress = progress;
        await persistJobStats(supabase, auditJobId, { fetch_progress: progress, fetch_coverage: coverage }, stats);
      } while (ordersCursor);
      coverage = markMonthPhaseComplete(coverage, monthLabel, 'orders');
      stats.fetch_coverage = coverage;
    }
    if (!ordersStepAdded) {
      const { stepId, sequence } = await runner.begin('Fetch orders', { data_type: 'order' });
      await runner.complete(stepId, sequence, { api_count: 0, verified_db_count: 0, next_cursor: null });
    }
    if (!completedPhases.includes('orders')) completedPhases.push('orders');
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
      const yParis = getDatePartsInTimeZone(now, SYNC_TZ).y;
      paymentsStart =
        integration.last_sync_at != null
          ? new Date(integration.last_sync_at)
          : startOfZonedYearJanFirstUtc(yParis - 7, SYNC_TZ);
      paymentsEnd = endOfZonedCalendarDay(now, SYNC_TZ);
    }
    const paymentRanges = getMonthlyZonedRanges(paymentsStart, paymentsEnd, SYNC_TZ);
    let paymentsStepAdded = false;

    for (const range of paymentRanges) {
      const monthLabel = new Date(range.startAt).toISOString().slice(0, 7);
      if (shouldSkipMonth(checkpoint ?? null, 'payments', monthLabel)) {
        coverage = markMonthPhaseComplete(coverage, monthLabel, 'payments');
        continue;
      }
      let paymentsPageInMonth = 0;
      let paymentsCursor: string | null = initialCursorForMonth(checkpoint ?? null, 'payments', monthLabel);

      do {
        const stepName = `Payments — ${monthLabel} — page ${paymentsPageInMonth + 1}`;
        const { stepId, sequence } = await runner.begin(stepName, {
          data_type: 'payment',
          month_label: monthLabel,
        });
        const payParams = new URLSearchParams();
        payParams.set('begin_time', range.startAt);
        payParams.set('end_time', range.endAt);
        if (paymentsCursor) payParams.set('cursor', paymentsCursor);
        const payUrl = `${SQUARE_API_BASE}/v2/payments?${payParams.toString()}`;
        const payResponse = await fetch(payUrl, { headers });
        if (!payResponse.ok) {
          const errText = await payResponse.text();
          let errDetails: unknown;
          try {
            errDetails = JSON.parse(errText);
          } catch {
            errDetails = errText;
          }
          const msg = `Failed to fetch payments: ${(errDetails as { errors?: { detail?: string }[] })?.errors?.[0]?.detail || payResponse.statusText}`;
          await runner.fail(stepId, sequence, { error: msg });
          return { error: msg };
        }
        const payData = await payResponse.json();
        const payments = payData.payments || [];
        paymentsCursor = payData.cursor || null;
        const api_count = payments.length;
        let stageRes: StagingUpsertResult = {
          inserted: 0,
          skipped_duplicates: 0,
          skipped_already_imported: 0,
          skipped_already_processed: 0,
          skipped_cross_job_active: 0,
        };
        if (payments.length > 0) {
          const rows = payments.map((payment: { id?: string }) => ({
            job_id: stagingJobId,
            data_type: 'payment',
            source_id: payment.id || '',
            payload: payment,
          }));
          stageRes = await upsertSquareStagingRows(supabase, rows, 'payment', {
            ...stagingCtx,
            stepId,
          });
          if (stageRes.error) {
            await runner.fail(stepId, sequence, { error: stageRes.error });
            return { error: stageRes.error };
          }
          stats.payments_fetched = Number(stats.payments_fetched) + payments.length;
        }
        if (payments.length > 0) {
          paymentsPageInMonth += 1;
          paymentsStepAdded = true;
        }
        const verified_db_count = await verifiedCountForStep(supabase, stepId);
        await runner.complete(
          stepId,
          sequence,
          stagingStepDetails(
            {
              data_type: 'payment',
              month_label: monthLabel,
              page: paymentsPageInMonth,
              api_count,
              verified_db_count,
              next_cursor: paymentsCursor,
            },
            stageRes
          )
        );
        const progress: FetchProgress = {
          phase: 'payments',
          month_label: monthLabel,
          page: paymentsPageInMonth,
          next_cursor: paymentsCursor,
          completed_phases: completedPhases,
        };
        stats.fetch_progress = progress;
        await persistJobStats(supabase, auditJobId, { fetch_progress: progress, fetch_coverage: coverage }, stats);
      } while (paymentsCursor);
      coverage = markMonthPhaseComplete(coverage, monthLabel, 'payments');
      stats.fetch_coverage = coverage;
    }
    if (!paymentsStepAdded) {
      const { stepId, sequence } = await runner.begin('Fetch payments', { data_type: 'payment' });
      await runner.complete(stepId, sequence, { api_count: 0, verified_db_count: 0, next_cursor: null });
    }
    if (!completedPhases.includes('payments')) completedPhases.push('payments');
  }

  stats.fetch_coverage = coverage;
  stats.fetch_complete = isFetchComplete(
    { ...stats, fetch_coverage: coverage, fetch_complete: undefined },
    syncType,
    stagingOptions
  );
  if (stats.fetch_complete) {
    delete stats.fetch_progress;
  }

  return { stats };
}

export async function fetchAndStagePennylane(
  supabase: any,
  integration: any,
  auditJobId: number,
  _syncType: string,
  stagingJobId: number = auditJobId
): Promise<{ error?: string; stats?: Record<string, number> }> {
  const accessToken = integration.access_token;
  if (!accessToken) {
    return { error: 'Access token not found. Please reconnect the integration.' };
  }
  const stats: Record<string, number> = { transactions_fetched: 0 };
  let sequence = await getNextStepSequence(supabase, auditJobId) - 1;

  let page = 1;
  const perPage = 100;

  while (true) {
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
      if (page === 1) {
        sequence += 1;
        await supabase.from('sync_job_steps').insert({
          job_id: auditJobId,
          sequence,
          name: 'Fetch transactions',
          status: 'done',
          details: { transactions: 0 },
        });
      }
      break;
    }

    const rows = transactions.map((tx: { id?: string; uuid?: string }) => ({
      job_id: stagingJobId,
      data_type: 'transaction',
      source_id: String(tx.id ?? tx.uuid ?? ''),
      payload: tx,
    }));
    const { error: insertErr } = await supabase.from('sync_pennylane_data').insert(rows);
    if (insertErr) return { error: `Failed to stage transactions: ${insertErr.message}` };

    stats.transactions_fetched += transactions.length;
    sequence += 1;
    await supabase.from('sync_job_steps').insert({
      job_id: auditJobId,
      sequence,
      name: `Transactions — page ${page}`,
      status: 'done',
      details: { transactions: transactions.length },
    });

    if (transactions.length < perPage) break;
    page += 1;
  }

  return { stats };
}

export async function completeStagingAndQueueProcess(
  supabase: any,
  integrationId: number,
  jobId: number,
  stats: Record<string, unknown>,
  origin: string,
  preserveStats?: Record<string, unknown>,
  syncType?: string,
  stagingOptions?: SquareStagingOptions
): Promise<void> {
  const mergedStats = { ...preserveStats, ...stats };
  const effectiveSyncType = syncType ?? 'full';
  const options = stagingOptions ?? {};

  if (!isFetchComplete(mergedStats, effectiveSyncType, options)) {
    await supabase
      .from('sync_jobs')
      .update({
        status: 'staging',
        stats: mergedStats,
        error_message: 'Fetch incomplete — remaining months or pages not finished',
      })
      .eq('id', jobId);
    return;
  }

  await supabase
    .from('sync_jobs')
    .update({
      status: 'pending',
      stats: mergedStats,
      error_message: null,
    })
    .eq('id', jobId);

  await supabase
    .from('integrations')
    .update({ last_sync_status: 'in_progress', last_sync_error: null, sync_active_job_id: jobId })
    .eq('id', integrationId);

  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers['x-cron-secret'] = secret;
  await fetch(`${origin}/api/cron/process-sync-jobs?job_id=${jobId}`, { method: 'POST', headers }).catch(() => {});
}

export async function runStagingForJob(
  supabase: any,
  integration: any,
  jobId: number,
  syncType: string,
  origin: string,
  period?: FullSyncPeriod,
  stagingJobId?: number,
  stagingOptions?: SquareStagingOptions,
  jobStats?: Record<string, unknown>,
  checkpoint?: FetchCheckpoint
): Promise<{ error?: string }> {
  const isPennylane = integration.integration_type === 'pennylane';
  const effectiveSyncType = isPennylane ? (syncType === 'full' ? 'transactions' : syncType) : syncType;
  const targetStagingJobId = stagingJobId ?? jobId;
  const options = stagingOptions ?? {};

  try {
    const result = isPennylane
      ? await fetchAndStagePennylane(supabase, integration, jobId, effectiveSyncType, targetStagingJobId)
      : await fetchAndStageSquare(
          supabase,
          integration,
          jobId,
          syncType,
          period,
          targetStagingJobId,
          options,
          checkpoint,
          jobStats
        );

    if (result.error) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_message: result.error,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return { error: result.error };
    }

    const merged = { ...jobStats, ...result.stats };
    if (isFetchComplete(merged, effectiveSyncType, options)) {
      await completeStagingAndQueueProcess(
        supabase,
        integration.id,
        jobId,
        result.stats || {},
        origin,
        jobStats,
        effectiveSyncType,
        options
      );
    } else {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'staging',
          stats: merged,
          error_message: null,
        })
        .eq('id', jobId);
    }
    return {};
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from('sync_jobs')
      .update({
        status: 'failed',
        error_message: msg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    return { error: msg };
  }
}
