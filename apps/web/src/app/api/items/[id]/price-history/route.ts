import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createItemPriceHistorySchema } from '@/shared/zod-schemas';
import { getTaxRateAndRuleForSaleLineWithItemTaxes, getTaxRateAndRuleForExpenseLineWithItemTaxes } from '@/lib/item-taxes-resolve';
import { getGroupMemberIds } from '@/lib/items/group-members';

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
    const costExtra = type === 'cost' ? ', unit_id, cost_basis_quantity' : '';

    const memberIds = await getGroupMemberIds(supabase, itemId);

    const { data, error } = await supabase
      .from(table)
      .select('id, item_id, effective_date, ' + valueCol + taxIncludedCol + costExtra)
      .in('item_id', memberIds)
      .order('effective_date', { ascending: false })
      .order('id', { ascending: false });

    if (error) throw error;

    let itemCategory: string | null = null;
    let itemCreatedAt: string | null = null;
    const { data: item } = await supabase
      .from('items')
      .select('created_at, category:item_categories(name)')
      .eq('id', itemId)
      .maybeSingle();
    itemCategory = ((item as { category?: { name?: string } | null } | null)?.category?.name) ?? null;
    itemCreatedAt = (item as { created_at?: string } | null)?.created_at ?? null;

    const rows = (data || []) as unknown as Record<string, unknown>[];
    const list = await Promise.all(
      rows.map(async (row) => {
        const entry = {
          id: row.id,
          itemId: row.item_id,
          effectiveDate: row.effective_date,
          value: row[valueCol] != null ? parseFloat(String(row[valueCol])) : null,
          taxIncluded: row.tax_included != null ? !!row.tax_included : undefined,
        } as { id: number; itemId: number; effectiveDate: string; value: number | null; taxIncluded?: boolean; resolvedTax?: Record<string, { rate: number; taxInclusive: boolean }> };

        if (type === 'sell') {
          const dateStr = String(row.effective_date ?? '').slice(0, 10);
          const resolvedTax: Record<string, { rate: number; taxInclusive: boolean }> = {};
          for (const salesType of SALES_TYPES) {
            const result = await getTaxRateAndRuleForSaleLineWithItemTaxes(
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
        if (type === 'cost') {
          const dateStr = String(row.effective_date ?? '').slice(0, 10);
          const expenseRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, itemId, itemCategory, dateStr, itemCreatedAt);
          if (entry.taxIncluded === undefined) entry.taxIncluded = expenseRule.taxInclusive ?? false;
          entry.resolvedTax = { expense: { rate: expenseRule.rate ?? 0, taxInclusive: expenseRule.taxInclusive ?? false } };
          const uid = row.unit_id as number | null | undefined;
          (entry as { unitId?: number | null }).unitId = uid != null ? Number(uid) : null;
          const bq = row.cost_basis_quantity as string | number | null | undefined;
          (entry as { basisQuantity?: number }).basisQuantity =
            bq != null && bq !== "" ? Number(bq) : 1;
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
    const { type, effectiveDate, value, taxIncluded, unitId: bodyUnitId, costBasisQuantity } =
      parsed.data;
    const supabase = supabaseServer();
    const itemId = parseInt(id, 10);
    if (Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item id' }, { status: 400 });
    }

    const table = type === 'sell' ? 'item_selling_price_history' : 'item_cost_history';
    const valueCol = type === 'sell' ? 'unit_price' : 'unit_cost';
    const payload: Record<string, unknown> = { item_id: itemId, effective_date: effectiveDate, [valueCol]: value };
    if (taxIncluded !== undefined) payload.tax_included = taxIncluded;

    if (type === 'cost') {
      let costUnitId: number | null | undefined = bodyUnitId;
      if (costUnitId === undefined) {
        const { data: it } = await supabase.from('items').select('unit_id').eq('id', itemId).maybeSingle();
        costUnitId = it?.unit_id ?? null;
      }
      payload.unit_id = costUnitId ?? null;
      payload.cost_basis_quantity =
        costBasisQuantity != null && costBasisQuantity > 0 ? costBasisQuantity : 1;
    }

    const selectCols =
      type === 'cost'
        ? 'id, effective_date, ' + valueCol + ', tax_included, unit_id, cost_basis_quantity'
        : 'id, effective_date, ' + valueCol + ', tax_included';

    const { data, error } = await supabase.from(table).insert(payload).select(selectCols).single();

    if (error) throw error;

    const row = data as unknown as Record<string, unknown>;
    const res: {
      id: number;
      effectiveDate: string;
      value: number;
      taxIncluded?: boolean;
      unitId?: number | null;
      basisQuantity?: number;
    } = {
      id: row.id as number,
      effectiveDate: row.effective_date as string,
      value: row[valueCol] != null ? parseFloat(String(row[valueCol])) : value,
    };
    if (row.tax_included != null) res.taxIncluded = !!row.tax_included;
    if (type === 'cost') {
      const uid = row.unit_id as number | null | undefined;
      res.unitId = uid != null ? Number(uid) : null;
      const bq = row.cost_basis_quantity as string | number | null | undefined;
      res.basisQuantity = bq != null && bq !== "" ? Number(bq) : 1;
    }
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
