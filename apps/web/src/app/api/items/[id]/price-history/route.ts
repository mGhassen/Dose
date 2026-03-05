import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { parseRequestBody, createItemPriceHistorySchema } from '@/shared/zod-schemas';

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

    const list = ((data || []) as unknown as Record<string, unknown>[]).map((row) => ({
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
    const parsed = await parseRequestBody(request, createItemPriceHistorySchema);
    if (!parsed.success) return parsed.response;
    const { type, effectiveDate, value } = parsed.data;
    const supabase = createServerSupabaseClient();
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';
    const valueCol = type === 'sell' ? 'unit_price' : 'unit_cost';

    const { data, error } = await supabase
      .from(table)
      .upsert(
        { item_id: itemId, effective_date: effectiveDate, [valueCol]: value },
        { onConflict: 'item_id,effective_date' }
      )
      .select('id, effective_date, ' + valueCol)
      .single();

    if (error) throw error;

    if (type === 'cost') {
      await supabase.from('items').update({ unit_cost: null }).eq('id', itemId);
    }

    const row = data as unknown as Record<string, unknown>;
    return NextResponse.json({
      id: row.id,
      effectiveDate: row.effective_date,
      value: row[valueCol] != null ? parseFloat(String(row[valueCol])) : value,
    }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error creating price history:', error);
    return NextResponse.json(
      { error: 'Failed to create price history', details: err?.message || String(error) },
      { status: 500 }
    );
  }
}
