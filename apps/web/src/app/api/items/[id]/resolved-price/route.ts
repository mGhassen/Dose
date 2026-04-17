import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getItemSellingPriceAsOf, getItemCostAsOf } from '@/lib/items/price-resolve';
import {
  getTaxRateAndRuleForSaleLineWithItemTaxes,
  getTaxRateAndRuleForExpenseLineWithItemTaxes,
} from '@/lib/item-taxes-resolve';

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
    const [selling, cost, itemRow] = await Promise.all([
      getItemSellingPriceAsOf(supabase, itemId, dateStr),
      getItemCostAsOf(supabase, itemId, dateStr),
      supabase.from('items').select('created_at, category:item_categories(name)').eq('id', itemId).maybeSingle(),
    ]);

    const itemCategory = ((itemRow.data as { category?: { name?: string } | null } | null)?.category?.name) ?? null;
    const itemCreatedAt = (itemRow.data as { created_at?: string } | null)?.created_at ?? null;

    const [saleRule, expenseRule] = await Promise.all([
      getTaxRateAndRuleForSaleLineWithItemTaxes(
        supabase,
        itemId,
        itemCategory,
        'on_site',
        dateStr,
        itemCreatedAt
      ),
      getTaxRateAndRuleForExpenseLineWithItemTaxes(
        supabase,
        itemId,
        itemCategory,
        dateStr,
        itemCreatedAt
      ),
    ]);

    const effectiveSellingTaxIncluded =
      selling.taxIncluded != null ? selling.taxIncluded : saleRule.taxInclusive ?? false;

    // For costs, treat the expense rule's taxInclusive flag as the source of truth.
    // If history says "false" but the rule is inclusive, we still interpret the stored
    // unit cost as tax-inclusive to match how cost history and item taxes work.
    const historyCostIncluded = cost.taxIncluded;
    const ruleCostIncluded = expenseRule.taxInclusive ?? null;
    let effectiveCostTaxIncluded: boolean;
    if (ruleCostIncluded === true) {
      effectiveCostTaxIncluded = true;
    } else if (historyCostIncluded != null) {
      effectiveCostTaxIncluded = historyCostIncluded;
    } else {
      effectiveCostTaxIncluded = ruleCostIncluded ?? false;
    }
    return NextResponse.json({
      unitPrice: selling.unitPrice,
      unitCost: cost.unitCost,
      taxIncluded: effectiveSellingTaxIncluded,
      costTaxIncluded: effectiveCostTaxIncluded,
      date: dateStr,
    });
  } catch (error: any) {
    console.error('Error resolving price:', error);
    return NextResponse.json(
      { error: 'Failed to resolve price', details: error.message },
      { status: 500 }
    );
  }
}
