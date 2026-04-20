import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, updatePersonnelHourEntrySchema } from '@/shared/zod-schemas';

function transformHourEntry(row: any) {
  return {
    id: row.id,
    personnelId: row.personnel_id,
    periodType: row.period_type,
    startDate: row.start_date,
    endDate: row.end_date,
    hoursWorked: parseFloat(row.hours_worked),
    hourlyRate: parseFloat(row.hourly_rate),
    taxVariableId: row.tax_variable_id ?? undefined,
    taxRatePercent: parseFloat(row.tax_rate_percent ?? 0),
    amountGross: parseFloat(row.amount_gross),
    amountTax: parseFloat(row.amount_tax ?? 0),
    amountNet: parseFloat(row.amount_net),
    isPaid: row.is_paid,
    paidDate: row.paid_date ?? undefined,
    expenseId: row.expense_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('personnel_hour_entries')
      .select('*')
      .eq('id', entryId)
      .eq('personnel_id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    return NextResponse.json(transformHourEntry(data));
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch hour entry', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const parsed = await parseRequestBody(request, updatePersonnelHourEntrySchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const supabase = supabaseServer();

    const { data: existing, error: findErr } = await supabase
      .from('personnel_hour_entries')
      .select('*')
      .eq('id', entryId)
      .eq('personnel_id', id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    const hoursWorked = body.hoursWorked ?? parseFloat(existing.hours_worked);
    const hourlyRate = body.hourlyRate ?? parseFloat(existing.hourly_rate);
    let taxRatePercent = body.taxRatePercent ?? parseFloat(existing.tax_rate_percent ?? 0);
    const taxVariableId = body.taxVariableId ?? existing.tax_variable_id ?? null;

    if (body.taxVariableId !== undefined && body.taxVariableId !== existing.tax_variable_id) {
      if (body.taxVariableId) {
        const { data: taxVar } = await supabase
          .from('variables')
          .select('value')
          .eq('id', body.taxVariableId)
          .maybeSingle();
        if (taxVar?.value != null) {
          taxRatePercent = parseFloat(taxVar.value as unknown as string);
        }
      } else {
        taxRatePercent = 0;
      }
    }

    const gross = round2(hoursWorked * hourlyRate);
    const tax = round2(gross * (taxRatePercent / 100));
    const net = round2(gross - tax);

    const update: Record<string, unknown> = {
      period_type: body.periodType ?? existing.period_type,
      start_date: body.startDate ?? existing.start_date,
      end_date: body.endDate ?? existing.end_date,
      hours_worked: hoursWorked,
      hourly_rate: hourlyRate,
      tax_variable_id: taxVariableId,
      tax_rate_percent: taxRatePercent,
      amount_gross: gross,
      amount_tax: tax,
      amount_net: net,
      notes: body.notes ?? existing.notes,
    };

    const { data, error } = await supabase
      .from('personnel_hour_entries')
      .update(update)
      .eq('id', entryId)
      .eq('personnel_id', id)
      .select()
      .single();

    if (error) throw error;

    if (existing.expense_id) {
      const { data: personnel } = await supabase
        .from('personnel')
        .select('first_name, last_name')
        .eq('id', id)
        .maybeSingle();
      const personName = personnel
        ? `${personnel.first_name} ${personnel.last_name}`
        : `Personnel #${id}`;
      const expenseName = `Contractor hours — ${personName} (${update.start_date} -> ${update.end_date})`;

      await supabase
        .from('expenses')
        .update({
          name: expenseName,
          category: 'personnel',
          amount: gross,
          subtotal: gross,
          total_tax: tax,
          expense_date: update.start_date,
          start_date: update.start_date,
          description: update.notes ?? null,
        })
        .eq('id', existing.expense_id);

      await supabase
        .from('expense_line_items')
        .update({
          quantity: hoursWorked,
          unit_price: hourlyRate,
          tax_rate_percent: taxRatePercent,
          tax_amount: tax,
          line_total: gross,
          personnel_id: Number(id),
          personnel_hour_entry_id: Number(entryId),
          line_kind: 'contractor_hours',
        })
        .eq('expense_id', existing.expense_id);

      await supabase
        .from('entries')
        .update({
          name: expenseName,
          amount: gross,
          description: update.notes ?? null,
          category: 'personnel',
          entry_date: update.start_date,
          due_date: update.start_date,
        })
        .eq('entry_type', 'expense')
        .eq('reference_id', existing.expense_id);
    }

    return NextResponse.json(transformHourEntry(data));
  } catch (error: any) {
    console.error('Error updating personnel hour entry:', error);
    return NextResponse.json(
      { error: 'Failed to update personnel hour entry', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const supabase = supabaseServer();

    const { data: existing } = await supabase
      .from('personnel_hour_entries')
      .select('expense_id')
      .eq('id', entryId)
      .eq('personnel_id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('personnel_hour_entries')
      .delete()
      .eq('id', entryId)
      .eq('personnel_id', id);
    if (error) throw error;

    if (existing?.expense_id) {
      await supabase.from('expenses').delete().eq('id', existing.expense_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting personnel hour entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete personnel hour entry', details: error.message },
      { status: 500 }
    );
  }
}
