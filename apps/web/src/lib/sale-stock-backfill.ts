import {
  completeStep,
  getNextStepSequence,
  insertStep,
} from '@/app/api/integrations/[id]/sync/sync-processor';
import {
  backfillAffectedSales,
  buildAffectedSalesFromImportErrors,
  mergeAffectedSalesMaps,
  type AffectedSaleRef,
} from '@/app/api/integrations/[id]/sync/recover-missing-catalog';
import { collectJobFamilyIds } from '@/lib/sync-job-recovery';

type SupabaseClient = { from: (table: string) => any };

export type StockBackfillStepResult = {
  ran: boolean;
  affected_sales: number;
  sales_backfilled: number;
  stock_rewritten: number;
  errors: number;
  sequence: number | null;
};

export async function resolveAffectedSalesForJob(
  supabase: SupabaseClient,
  integrationId: number,
  jobId: number,
  inMemory?: Map<number, AffectedSaleRef>
): Promise<{ affectedSales: Map<number, AffectedSaleRef>; familyJobIds: number[] }> {
  const familyJobIds = await collectJobFamilyIds(supabase as any, jobId);
  const fromErrors = await buildAffectedSalesFromImportErrors(
    supabase,
    integrationId,
    familyJobIds
  );
  const affectedSales = inMemory
    ? mergeAffectedSalesMaps(new Map(inMemory), fromErrors)
    : fromErrors;
  return { affectedSales, familyJobIds };
}

export async function runStockBackfillStep(
  supabase: SupabaseClient,
  job: { id: number; integration_id: number; stats?: Record<string, unknown> | null },
  affectedSales: Map<number, AffectedSaleRef>,
  errorJobIds: number[]
): Promise<StockBackfillStepResult> {
  if (affectedSales.size === 0) {
    return {
      ran: false,
      affected_sales: 0,
      sales_backfilled: 0,
      stock_rewritten: 0,
      errors: 0,
      sequence: null,
    };
  }

  const backfillSeq = await getNextStepSequence(supabase as any, job.id);
  await insertStep(
    supabase as any,
    job.id,
    backfillSeq,
    `Backfill sale line items + stock movements`,
    'running',
    { affected_sales: affectedSales.size }
  );
  const backfillRes = await backfillAffectedSales(
    supabase,
    job.integration_id,
    job.id,
    affectedSales,
    { errorJobIds }
  );
  await completeStep(supabase as any, job.id, backfillSeq, {
    affected_sales: affectedSales.size,
    sales_backfilled: backfillRes.sales_backfilled,
    stock_rewritten: backfillRes.stock_rewritten,
    errors: backfillRes.errors,
  });

  const prevStats = (job.stats ?? {}) as Record<string, number>;
  prevStats.stock_reconciled = (prevStats.stock_reconciled ?? 0) + backfillRes.sales_backfilled;
  prevStats.stock_reconcile_failed = Math.max(
    0,
    (prevStats.stock_reconcile_failed ?? 0) - backfillRes.sales_backfilled
  );
  await supabase.from('sync_jobs').update({ stats: prevStats }).eq('id', job.id);

  return {
    ran: true,
    affected_sales: affectedSales.size,
    sales_backfilled: backfillRes.sales_backfilled,
    stock_rewritten: backfillRes.stock_rewritten,
    errors: backfillRes.errors,
    sequence: backfillSeq,
  };
}
