import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

type HistoryType = 'sell' | 'cost';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as HistoryType | null;
    if (type !== 'sell' && type !== 'cost') {
      return NextResponse.json({ error: 'Missing or invalid type (sell|cost)' }, { status: 400 });
    }
    const supabase = createServerSupabaseClient();
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';
    const valueCol = type === 'sell' ? 'unit_price' : 'unit_cost';

    const { data, error } = await supabase
      .from(table)
      .select('id, effective_date, ' + valueCol)
      .eq('item_id', itemId)
      .order('effective_date', { ascending: false });

    if (error) throw error;

    const list = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      effectiveDate: row.effective_date,
      value: row[valueCol] != null ? parseFloat(String(row[valueCol])) : null,
    }));
    return NextResponse.json(list);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error listing price history:', error);
    return NextResponse.json(
      { error: 'Failed to list price history', details: err?.message || String(error) },
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
    const body = await request.json();
    const type = body.type as HistoryType;
    const effectiveDate = body.effectiveDate as string | undefined;
    const value = body.value as number | undefined;
    if (type !== 'sell' && type !== 'cost') {
      return NextResponse.json({ error: 'Invalid type (sell|cost)' }, { status: 400 });
    }
    if (!effectiveDate || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
      return NextResponse.json({ error: 'effectiveDate required (YYYY-MM-DD)' }, { status: 400 });
    }
    if (value == null || typeof value !== 'number' || value < 0) {
      return NextResponse.json({ error: 'value required (non-negative number)' }, { status: 400 });
    }
    const supabase = createServerSupabaseClient();
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';
    const valueCol = type === 'sell' ? 'unit_price' : 'unit_cost';

    const { data, error } = await supabase
      .from(table)
      .insert({ item_id: itemId, effective_date: effectiveDate, [valueCol]: value })
      .select('id, effective_date')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Entry already exists for this date' }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({
      id: data.id,
      effectiveDate: data.effective_date,
      value,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error creating price history:', error);
    return NextResponse.json(
      { error: 'Failed to create price history', details: err?.message || String(error) },
      { status: 500 }
    );
  }
}
