import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, updateItemPriceHistorySchema } from '@/shared/zod-schemas';
import { getGroupMemberIds } from '@/lib/items/group-members';

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
    const { effectiveDate, value, taxIncluded, unitId, costBasisQuantity } = parsed.data;
    const supabase = supabaseServer();
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }
    const memberIds = await getGroupMemberIds(supabase, itemId);
    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';
    const valueCol = type === 'sell' ? 'unit_price' : 'unit_cost';

    const updates: Record<string, unknown> = {};
    if (effectiveDate !== undefined) updates.effective_date = effectiveDate;
    if (value !== undefined) updates[valueCol] = value;
    if (taxIncluded !== undefined) updates.tax_included = taxIncluded;
    if (type === 'cost' && unitId !== undefined) updates.unit_id = unitId;
    if (type === 'cost' && costBasisQuantity !== undefined) {
      updates.cost_basis_quantity = costBasisQuantity;
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', entryId)
      .in('item_id', memberIds)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const row = data as Record<string, unknown>;
    const res: {
      id: number;
      effectiveDate: string;
      value: number | null;
      taxIncluded?: boolean;
      unitId?: number | null;
      basisQuantity?: number;
    } = {
      id: row.id as number,
      effectiveDate: row.effective_date as string,
      value: row[valueCol] != null ? parseFloat(String(row[valueCol])) : null,
    };
    if (row.tax_included != null) res.taxIncluded = !!row.tax_included;
    if (type === 'cost') {
      const uid = row.unit_id as number | null | undefined;
      res.unitId = uid != null ? Number(uid) : null;
      const bq = row.cost_basis_quantity as string | number | null | undefined;
      res.basisQuantity = bq != null && bq !== "" ? Number(bq) : 1;
    }
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
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }
    const memberIds = await getGroupMemberIds(supabase, itemId);
    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';

    const { data: deleted, error } = await supabase
      .from(table)
      .delete()
      .eq('id', entryId)
      .in('item_id', memberIds)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting price history:', error);
    return NextResponse.json(
      { error: 'Failed to delete price history', details: error.message },
      { status: 500 }
    );
  }
}
