import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  parseRequestBody,
  markPersonnelHourEntryPaidSchema,
} from '@/shared/zod-schemas';
import { replacePaymentsForEntry } from '@/lib/ledger/replace-entry-payments';

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

    if (!body.isPaid) {
      if (entry.expense_id) {
        await supabase
          .from('entries')
          .delete()
          .eq('entry_type', 'expense')
          .eq('reference_id', entry.expense_id);
        await supabase.from('expenses').delete().eq('id', entry.expense_id);
      }
      const { data: updated, error: updErr } = await supabase
        .from('personnel_hour_entries')
        .update({ is_paid: false, paid_date: null, expense_id: null })
        .eq('id', entryId)
        .select()
        .single();
      if (updErr) throw updErr;
      return NextResponse.json({ id: updated.id, isPaid: false, expenseId: null });
    }

    const paidDate = body.paidDate || new Date().toISOString().slice(0, 10);
    const category = body.category || 'personnel';

    const { data: personnel } = await supabase
      .from('personnel')
      .select('first_name, last_name')
      .eq('id', id)
      .maybeSingle();
    const personName = personnel
      ? `${personnel.first_name} ${personnel.last_name}`
      : `Personnel #${id}`;
    const name = `Contractor hours — ${personName} (${entry.start_date} → ${entry.end_date})`;

    const gross = parseFloat(entry.amount_gross);
    const tax = parseFloat(entry.amount_tax ?? 0);

    let expenseId = entry.expense_id as number | null;
    if (!expenseId) {
      const { data: expenseRow, error: insertErr } = await supabase
        .from('expenses')
        .insert({
          name,
          category,
          expense_type: 'expense',
          expense_date: paidDate,
          start_date: paidDate,
          description: entry.notes ?? null,
          amount: gross,
          subtotal: gross,
          total_tax: tax,
          total_discount: 0,
          is_active: true,
        })
        .select()
        .single();
      if (insertErr || !expenseRow?.id) {
        return NextResponse.json(
          { error: 'Failed to create expense', details: insertErr?.message ?? 'No row' },
          { status: 500 }
        );
      }
      expenseId = expenseRow.id;

      const { error: lineErr } = await supabase.from('expense_line_items').insert({
        expense_id: expenseId,
        item_id: null,
        quantity: entry.hours_worked,
        unit_id: null,
        unit_price: entry.hourly_rate,
        unit_cost: null,
        tax_rate_percent: parseFloat(entry.tax_rate_percent ?? 0),
        tax_amount: tax,
        line_total: gross,
        sort_order: 0,
      });
      if (lineErr) {
        await supabase.from('expenses').delete().eq('id', expenseId);
        return NextResponse.json(
          { error: 'Failed to create expense line items', details: lineErr.message },
          { status: 500 }
        );
      }

      const { data: entryRow, error: entryErr } = await supabase
        .from('entries')
        .insert({
          direction: 'output',
          entry_type: 'expense',
          name,
          amount: gross,
          description: entry.notes ?? null,
          category,
          entry_date: paidDate,
          reference_id: expenseId,
          is_active: true,
        })
        .select('id')
        .single();
      if (entryErr || !entryRow?.id) {
        await supabase.from('expenses').delete().eq('id', expenseId);
        return NextResponse.json(
          { error: 'Failed to create ledger entry', details: entryErr?.message ?? 'No entry id' },
          { status: 500 }
        );
      }

      const payRes = await replacePaymentsForEntry(supabase, entryRow.id, [
        { amount: gross, paymentDate: paidDate },
      ]);
      if (payRes.error) {
        await supabase.from('entries').delete().eq('id', entryRow.id);
        await supabase.from('expenses').delete().eq('id', expenseId);
        return NextResponse.json(
          { error: 'Failed to record payments', details: payRes.error },
          { status: 500 }
        );
      }
    }

    const { data: updated, error: updErr } = await supabase
      .from('personnel_hour_entries')
      .update({
        is_paid: true,
        paid_date: paidDate,
        expense_id: expenseId,
      })
      .eq('id', entryId)
      .select()
      .single();
    if (updErr) throw updErr;

    return NextResponse.json({
      id: updated.id,
      isPaid: true,
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
