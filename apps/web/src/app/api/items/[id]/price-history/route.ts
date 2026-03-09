import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createItemPriceHistorySchema } from '@/shared/zod-schemas';
import { getTaxRateAndRuleForSaleLine } from '@/lib/tax-rules-resolve';

type HistoryType = 'sell' | 'cost';

const SALES_TYPES = ['on_site', 'delivery', 'takeaway', 'catering', 'other'] as const;

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
    const supabase = supabaseServer();
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

    let itemCategory: string | null = null;
    let itemCreatedAt: string | null = null;
    if (type === 'sell') {
      const { data: item } = await supabase
        .from('items')
        .select('category, created_at')
        .eq('id', itemId)
        .maybeSingle();
      itemCategory = (item as { category?: string } | null)?.category ?? null;
      itemCreatedAt = (item as { created_at?: string } | null)?.created_at ?? null;
    }

    const rows = (data || []) as unknown as Record<string, unknown>[];
    const list = await Promise.all(
      rows.map(async (row) => {
        const entry = {
          id: row.id,
          effectiveDate: row.effective_date,
          value: row[valueCol] != null ? parseFloat(String(row[valueCol])) : null,
        } as { id: number; effectiveDate: string; value: number | null; resolvedTax?: Record<string, { rate: number; taxInclusive: boolean }> };

        if (type === 'sell') {
          const dateStr = String(row.effective_date ?? '').slice(0, 10);
          const resolvedTax: Record<string, { rate: number; taxInclusive: boolean }> = {};
          for (const salesType of SALES_TYPES) {
            const result = await getTaxRateAndRuleForSaleLine(
              supabase,
              itemId,
              itemCategory,
              salesType,
              dateStr,
              itemCreatedAt
            );
            resolvedTax[salesType] = { rate: result.rate, taxInclusive: result.taxInclusive ?? false };
          }
          entry.resolvedTax = resolvedTax;
        }
        return entry;
      })
    );
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
    const supabase = supabaseServer();
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    /** Stored value is always excl. tax; client converts incl→excl before POST when needed. */
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
