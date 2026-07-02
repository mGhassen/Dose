import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getSyncJobWithIntegrationForUser } from '@/lib/sync-job-access';
import {
  resolveAffectedSalesForJob,
  runStockBackfillStep,
} from '@/lib/sale-stock-backfill';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const supabase = supabaseServer();
    const access = await getSyncJobWithIntegrationForUser(supabase, jobId, token);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const job = access.job as {
      id: number;
      integration_id: number;
      status: string;
      stats?: Record<string, unknown> | null;
    };

    const { affectedSales, familyJobIds } = await resolveAffectedSalesForJob(
      supabase,
      job.integration_id,
      job.id
    );

    if (affectedSales.size === 0) {
      return NextResponse.json(
        {
          error: 'No sales with pending stock reconciliation for this job.',
          stock_reconcile_failed: (job.stats?.stock_reconcile_failed as number | undefined) ?? 0,
        },
        { status: 400 }
      );
    }

    const result = await runStockBackfillStep(supabase, job, affectedSales, familyJobIds);

    return NextResponse.json({
      job_id: job.id,
      message: result.ran
        ? `Backfilled ${result.sales_backfilled} sale(s), ${result.stock_rewritten} stock movement(s).`
        : 'Nothing to backfill.',
      ...result,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Backfill failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
