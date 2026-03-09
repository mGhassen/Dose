import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, updateItemPriceHistorySchema } from '@/shared/zod-schemas';

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
    const parsed = await parseRequestBody(request, updateItemPriceHistorySchema);
    if (!parsed.success) return parsed.response;
    const { effectiveDate, value, taxIncluded } = parsed.data;
    const supabase = supabaseServer();
    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';
    const valueCol = type === 'sell' ? 'unit_price' : 'unit_cost';

    const updates: Record<string, unknown> = {};
    if (effectiveDate !== undefined) updates.effective_date = effectiveDate;
    if (value !== undefined) updates[valueCol] = value;
    if (taxIncluded !== undefined) updates.tax_included = taxIncluded;

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', entryId)
      .eq('item_id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const row = data as Record<string, unknown>;
    const res: { id: number; effectiveDate: string; value: number | null; taxIncluded?: boolean } = {
      id: row.id as number,
      effectiveDate: row.effective_date as string,
      value: row[valueCol] != null ? parseFloat(String(row[valueCol])) : null,
    };
    if (row.tax_included != null) res.taxIncluded = !!row.tax_included;
    return NextResponse.json(res);
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
    const supabase = supabaseServer();
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
