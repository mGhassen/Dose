import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createPersonnelHourEntrySchema } from '@/shared/zod-schemas';

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

    return NextResponse.json((data || []).map(transformHourEntry));
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
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(transformHourEntry(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating personnel hour entry:', error);
    return NextResponse.json(
      { error: 'Failed to create personnel hour entry', details: error.message },
      { status: 500 }
    );
  }
}
