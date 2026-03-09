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
    const taxIncludedCol = ', tax_included';

    const { data, error } = await supabase
      .from(table)
      .select('id, effective_date, ' + valueCol + taxIncludedCol)
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
          taxIncluded: row.tax_included != null ? !!row.tax_included : undefined,
        } as { id: number; effectiveDate: string; value: number | null; taxIncluded?: boolean; resolvedTax?: Record<string, { rate: number; taxInclusive: boolean }> };

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
    const { type, effectiveDate, value, taxIncluded } = parsed.data;
    const supabase = supabaseServer();
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';
    const valueCol = type === 'sell' ? 'unit_price' : 'unit_cost';
    const payload: Record<string, unknown> = { item_id: itemId, effective_date: effectiveDate, [valueCol]: value };
    if (taxIncluded !== undefined) payload.tax_included = taxIncluded;

    const { data, error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: 'item_id,effective_date' })
      .select('id, effective_date, ' + valueCol + ', tax_included')
      .single();

    if (error) throw error;

    const row = data as unknown as Record<string, unknown>;
    const res: { id: number; effectiveDate: string; value: number; taxIncluded?: boolean } = {
      id: row.id as number,
      effectiveDate: row.effective_date as string,
      value: row[valueCol] != null ? parseFloat(String(row[valueCol])) : value,
    };
    if (row.tax_included != null) res.taxIncluded = !!row.tax_included;
    return NextResponse.json(res, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error creating price history:', error);
    return NextResponse.json(
      { error: 'Failed to create price history', details: err?.message || String(error) },
      { status: 500 }
    );
  }
}
