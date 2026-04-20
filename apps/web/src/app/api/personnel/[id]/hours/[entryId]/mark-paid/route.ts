import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  parseRequestBody,
  markPersonnelHourEntryPaidSchema,
} from '@/shared/zod-schemas';
import { reconcileContractorHourEntryPayments } from '@/lib/personnel/contractor-hour-payments';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const parsed = await parseRequestBody(request, markPersonnelHourEntryPaidSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const supabase = supabaseServer();

    const { data: entry, error: fetchErr } = await supabase
      .from('personnel_hour_entries')
      .select('*')
      .eq('id', entryId)
      .eq('personnel_id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    const paidDate = body.paidDate || new Date().toISOString().slice(0, 10);
    const gross = parseFloat(entry.amount_gross);
    const expenseId = entry.expense_id as number | null;
    if (!expenseId) {
      return NextResponse.json(
        { error: 'Missing linked expense. Log hours again or recreate entry.' },
        { status: 400 }
      );
    }

    const { data: ledgerEntry, error: ledgerErr } = await supabase
      .from('entries')
      .select('id')
      .eq('entry_type', 'expense')
      .eq('reference_id', expenseId)
      .maybeSingle();
    if (ledgerErr) throw ledgerErr;
    if (!ledgerEntry?.id) {
      return NextResponse.json(
        { error: 'Missing linked ledger entry for expense' },
        { status: 400 }
      );
    }

    if (!body.isPaid) {
      await supabase.from('payments').delete().eq('entry_id', ledgerEntry.id);
      await reconcileContractorHourEntryPayments(supabase, entryId);
      const { data: updated, error: updErr } = await supabase
        .from('personnel_hour_entries')
        .select()
        .eq('id', entryId)
        .single();
      if (updErr) throw updErr;
      return NextResponse.json({ id: updated.id, isPaid: updated.is_paid, expenseId });
    }

    const { data: currentPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('entry_id', ledgerEntry.id);
    const alreadyPaid = (currentPayments || []).reduce(
      (s, p: any) => s + parseFloat(String(p.amount || 0)),
      0
    );
    const remaining = Math.max(0, Math.round((gross - alreadyPaid) * 100) / 100);
    const requestedAmount = body.amount != null ? Number(body.amount) : remaining;
    const paymentAmount = Math.round(Math.max(0, requestedAmount) * 100) / 100;
    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'No remaining amount to pay' },
        { status: 400 }
      );
    }
    if (paymentAmount - remaining > 0.01) {
      return NextResponse.json(
        { error: 'Payment amount cannot exceed remaining amount' },
        { status: 400 }
      );
    }

    const { error: payErr } = await supabase.from('payments').insert({
      entry_id: ledgerEntry.id,
      payment_date: paidDate,
      amount: paymentAmount,
      is_paid: true,
      paid_date: paidDate,
      notes: entry.notes ?? null,
    });
    if (payErr) throw payErr;

    await reconcileContractorHourEntryPayments(supabase, entryId);
    const { data: updated, error: updErr } = await supabase
      .from('personnel_hour_entries')
      .select()
      .eq('id', entryId)
      .single();
    if (updErr) throw updErr;

    return NextResponse.json({
      id: updated.id,
      isPaid: updated.is_paid,
      paidDate: updated.paid_date,
      expenseId: updated.expense_id,
    });
  } catch (error: any) {
    console.error('Error marking personnel hour entry paid:', error);
    return NextResponse.json(
      { error: 'Failed to mark paid', details: error.message },
      { status: 500 }
    );
  }
}
