import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { getTaxRateForSaleLine, getTaxRateForExpenseLine } from '@/lib/tax-rules-resolve';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context');
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const supabase = createServerSupabaseClient();

    if (context === 'sale') {
      const salesType = searchParams.get('salesType') || '';
      const itemIdParam = searchParams.get('itemId');
      const itemId = itemIdParam ? parseInt(itemIdParam, 10) : null;
      let itemCategory: string | null = null;
      if (itemId) {
        const { data: item } = await supabase.from('items').select('category').eq('id', itemId).maybeSingle();
        itemCategory = item?.category ?? null;
      }
      const rate = await getTaxRateForSaleLine(supabase, itemId, itemCategory, salesType, dateStr);
      return NextResponse.json({ rate });
    }

    if (context === 'expense') {
      const itemIdParam = searchParams.get('itemId');
      const itemId = itemIdParam ? parseInt(itemIdParam, 10) : null;
      const itemCategory = searchParams.get('itemCategory') || null;
      const rate = await getTaxRateForExpenseLine(supabase, itemId, itemCategory, dateStr);
      return NextResponse.json({ rate });
    }

    return NextResponse.json({ error: 'Invalid context; use context=sale or context=expense' }, { status: 400 });
  } catch (error: any) {
    console.error('Error resolving tax rate:', error);
    return NextResponse.json(
      { error: 'Failed to resolve tax rate', details: error.message },
      { status: 500 }
    );
  }
}
