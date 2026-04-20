import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { reconcileContractorHourEntryPayments } from '@/lib/personnel/contractor-hour-payments';

/** Recompute `is_paid` / `paid_date` from ledger payments (e.g. after deleting a single payment). */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const supabase = supabaseServer();

    const { data: row, error: findErr } = await supabase
      .from('personnel_hour_entries')
      .select('id, personnel_id')
      .eq('id', entryId)
      .eq('personnel_id', id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!row) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const result = await reconcileContractorHourEntryPayments(supabase, entryId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error reconciling contractor hour payments:', error);
    return NextResponse.json(
      { error: 'Failed to reconcile payments', details: error.message },
      { status: 500 }
    );
  }
}
