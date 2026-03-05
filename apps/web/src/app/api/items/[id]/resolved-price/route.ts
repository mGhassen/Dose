import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getItemSellingPriceAsOf, getItemCostAsOf } from '@/lib/items/price-resolve';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }
    const supabase = supabaseServer();
    const [unitPrice, unitCost] = await Promise.all([
      getItemSellingPriceAsOf(supabase, itemId, dateStr),
      getItemCostAsOf(supabase, itemId, dateStr),
    ]);
    return NextResponse.json({ unitPrice, unitCost, date: dateStr });
  } catch (error: any) {
    console.error('Error resolving price:', error);
    return NextResponse.json(
      { error: 'Failed to resolve price', details: error.message },
      { status: 500 }
    );
  }
}
