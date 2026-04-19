import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export type StockMovementsAnalytics = {
  totals: {
    total_count: number;
    total_in_qty: number;
    total_out_qty: number;
    total_waste_qty: number;
    total_expired_qty: number;
    total_adj_qty: number;
    count_in: number;
    count_out: number;
    count_waste: number;
    count_expired: number;
    net: number;
  } | null;
  daily: Array<{
    date: string;
    qty_in: number;
    qty_out: number;
    qty_waste: number;
    qty_expired: number;
    qty_adj: number;
    count: number;
    net: number;
  }>;
  by_type: Array<{ type: string; count: number; qty: number }>;
  by_category: Array<{
    name: string;
    qty_in: number;
    qty_out: number;
    net: number;
    count: number;
  }>;
  by_location: Array<{ name: string; value: number }>;
  by_reference: Array<{ name: string; value: number }>;
  top_items: Array<{
    item_id: number;
    name: string;
    unit: string;
    qty_in: number;
    qty_out: number;
    net: number;
    count: number;
  }>;
  weekday: Array<{ dow: number; count: number; qty: number }>;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const itemIdRaw = searchParams.get('itemId') || searchParams.get('ingredientId');
    const movementType = searchParams.get('movementType');

    const types = movementType
      ? movementType.split(',').map((t) => t.trim()).filter(Boolean)
      : null;

    const supabase = supabaseServer();

    let pItemIds: number[] | null = null;
    if (itemIdRaw) {
      const id = Number(itemIdRaw);
      if (!Number.isFinite(id)) {
        return NextResponse.json(
          { error: 'Invalid itemId', details: 'itemId must be a number' },
          { status: 400 }
        );
      }
      const { getGroupMemberIds } = await import('@/lib/items/group-members');
      pItemIds = await getGroupMemberIds(supabase, id);
    }

    const { data, error } = await supabase.rpc('stock_movements_analytics', {
      p_start_date: startDate ?? null,
      p_end_date: endDate ? `${endDate}T23:59:59.999Z` : null,
      p_item_ids: pItemIds,
      p_movement_types: types,
    });

    if (error) throw error;

    return NextResponse.json((data ?? {}) as StockMovementsAnalytics);
  } catch (error: any) {
    console.error('Error fetching stock movements analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movements analytics', details: error.message },
      { status: 500 }
    );
  }
}
