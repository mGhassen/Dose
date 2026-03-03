import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

type HistoryType = 'sell' | 'cost';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as HistoryType | null;
    if (type !== 'sell' && type !== 'cost') {
      return NextResponse.json({ error: 'Missing or invalid type (sell|cost)' }, { status: 400 });
    }
    const body = await request.json();
    const effectiveDate = body.effectiveDate as string | undefined;
    const value = body.value as number | undefined;
    const supabase = createServerSupabaseClient();
    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';
    const valueCol = type === 'sell' ? 'unit_price' : 'unit_cost';

    const updates: Record<string, unknown> = {};
    if (effectiveDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
        return NextResponse.json({ error: 'effectiveDate must be YYYY-MM-DD' }, { status: 400 });
      }
      updates.effective_date = effectiveDate;
    }
    if (value !== undefined) {
      if (typeof value !== 'number' || value < 0) {
        return NextResponse.json({ error: 'value must be non-negative number' }, { status: 400 });
      }
      updates[valueCol] = value;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', entryId)
      .eq('item_id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      id: data.id,
      effectiveDate: data.effective_date,
      value: data[valueCol] != null ? parseFloat(data[valueCol]) : null,
    });
  } catch (error: any) {
    console.error('Error updating price history:', error);
    return NextResponse.json(
      { error: 'Failed to update price history', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as HistoryType | null;
    if (type !== 'sell' && type !== 'cost') {
      return NextResponse.json({ error: 'Missing or invalid type (sell|cost)' }, { status: 400 });
    }
    const supabase = createServerSupabaseClient();
    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', entryId)
      .eq('item_id', id);

    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting price history:', error);
    return NextResponse.json(
      { error: 'Failed to delete price history', details: error.message },
      { status: 500 }
    );
  }
}
