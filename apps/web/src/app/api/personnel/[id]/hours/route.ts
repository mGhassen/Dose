import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createPersonnelHourEntrySchema } from '@/shared/zod-schemas';
import { sumPaymentsByExpenseIds } from '@/lib/personnel/contractor-hour-payments';

function transformHourEntry(row: any, paidAmountGross?: number) {
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
    paidAmountGross: paidAmountGross !== undefined ? paidAmountGross : undefined,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from('personnel_hour_entries')
      .select('*')
      .eq('personnel_id', id)
      .order('start_date', { ascending: false });

    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache') ||
        error.message?.includes('Could not find the table')
      ) {
        return NextResponse.json([]);
      }
      throw error;
    }

    const rows = data || [];
    const expenseIds = rows
      .map((r: any) => r.expense_id)
      .filter((x: any) => x != null)
      .map((x: any) => Number(x));
    const paidByExpense = await sumPaymentsByExpenseIds(supabase, expenseIds);

    return NextResponse.json(
      rows.map((r: any) => {
        const eid = r.expense_id != null ? Number(r.expense_id) : null;
        const paid = eid != null ? paidByExpense.get(eid) ?? 0 : 0;
        return transformHourEntry(r, eid != null ? paid : undefined);
      })
    );
  } catch (error: any) {
    console.error('Error fetching personnel hour entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personnel hour entries', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await parseRequestBody(request, createPersonnelHourEntrySchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const supabase = supabaseServer();

    let taxRatePercent = body.taxRatePercent ?? 0;
    if (body.taxVariableId) {
      const { data: taxVar } = await supabase
        .from('variables')
        .select('value')
        .eq('id', body.taxVariableId)
        .maybeSingle();
      if (taxVar?.value != null) {
        taxRatePercent = parseFloat(taxVar.value as unknown as string);
      }
    }

    const gross = round2(body.hoursWorked * body.hourlyRate);
    const tax = round2(gross * (taxRatePercent / 100));
    const net = round2(gross - tax);
    const defaultDate = body.startDate;

    const { data: personnel } = await supabase
      .from('personnel')
      .select('first_name, last_name')
      .eq('id', id)
      .maybeSingle();
    const personName = personnel
      ? `${personnel.first_name} ${personnel.last_name}`
      : `Personnel #${id}`;
    const expenseName = `Contractor hours — ${personName} (${body.startDate} -> ${body.endDate})`;

    const { data: expenseRow, error: expenseErr } = await supabase
      .from('expenses')
      .insert({
        name: expenseName,
        category: 'personnel',
        expense_type: 'expense',
        expense_date: defaultDate,
        start_date: defaultDate,
        description: body.notes ?? null,
        amount: gross,
        subtotal: gross,
        total_tax: tax,
        total_discount: 0,
        is_active: true,
      })
      .select('id')
      .single();
    if (expenseErr || !expenseRow?.id) {
      throw new Error(expenseErr?.message ?? 'Failed to create contractor expense');
    }

    const { error: lineErr } = await supabase.from('expense_line_items').insert({
      expense_id: expenseRow.id,
      item_id: null,
      quantity: body.hoursWorked,
      unit_id: null,
      unit_price: body.hourlyRate,
      unit_cost: null,
      tax_rate_percent: taxRatePercent,
      tax_amount: tax,
      line_total: gross,
      sort_order: 0,
    });
    if (lineErr) {
      await supabase.from('expenses').delete().eq('id', expenseRow.id);
      throw new Error(lineErr.message);
    }

    const { error: entryErr } = await supabase.from('entries').insert({
      direction: 'output',
      entry_type: 'expense',
      name: expenseName,
      amount: gross,
      description: body.notes ?? null,
      category: 'personnel',
      entry_date: defaultDate,
      due_date: defaultDate,
      reference_id: expenseRow.id,
      is_active: true,
    });
    if (entryErr) {
      await supabase.from('expenses').delete().eq('id', expenseRow.id);
      throw new Error(entryErr.message);
    }

    const { data, error } = await supabase
      .from('personnel_hour_entries')
      .insert({
        personnel_id: id,
        period_type: body.periodType,
        start_date: body.startDate,
        end_date: body.endDate,
        hours_worked: body.hoursWorked,
        hourly_rate: body.hourlyRate,
        tax_variable_id: body.taxVariableId ?? null,
        tax_rate_percent: taxRatePercent,
        amount_gross: gross,
        amount_tax: tax,
        amount_net: net,
        expense_id: expenseRow.id,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      await supabase.from('entries').delete().eq('entry_type', 'expense').eq('reference_id', expenseRow.id);
      await supabase.from('expenses').delete().eq('id', expenseRow.id);
      throw error;
    }

    await supabase
      .from('expense_line_items')
      .update({
        personnel_id: Number(id),
        personnel_hour_entry_id: data.id,
        line_kind: 'contractor_hours',
      })
      .eq('expense_id', expenseRow.id);

    return NextResponse.json(transformHourEntry(data, 0), { status: 201 });
  } catch (error: any) {
    console.error('Error creating personnel hour entry:', error);
    return NextResponse.json(
      { error: 'Failed to create personnel hour entry', details: error.message },
      { status: 500 }
    );
  }
}
