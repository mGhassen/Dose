import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integration_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const reconciled = searchParams.get('reconciled');
    const q = searchParams.get('q')?.trim();
    const minAmount = searchParams.get('min_amount');
    const maxAmount = searchParams.get('max_amount');
    const reconciledEntityType = searchParams.get('reconciled_entity_type')?.trim();
    const sortBy = searchParams.get('sort_by') ?? 'execution_date';
    const sortOrder = searchParams.get('sort_order') ?? 'desc';
    const { page, limit, offset } = getPaginationParams(searchParams);

    const allowedSortColumns = ['execution_date', 'amount', 'label', 'counterparty_name'] as const;
    const column = allowedSortColumns.includes(sortBy as any) ? sortBy : 'execution_date';
    const ascending = sortOrder === 'asc';

    const supabase = supabaseServer();
    let query = supabase
      .from('bank_transactions')
      .select('*', { count: 'exact' })
      .order(column, { ascending });

    if (integrationId) query = query.eq('integration_id', integrationId);
    if (fromDate) query = query.gte('execution_date', fromDate);
    if (toDate) query = query.lte('execution_date', toDate);
    if (reconciled === 'true') query = query.not('reconciled_entity_type', 'is', null);
    if (reconciled === 'false') query = query.is('reconciled_entity_type', null);
    if (reconciledEntityType) query = query.eq('reconciled_entity_type', reconciledEntityType);
    if (minAmount != null && minAmount !== '') {
      const n = Number(minAmount);
      if (!Number.isNaN(n)) query = query.gte('amount', n);
    }
    if (maxAmount != null && maxAmount !== '') {
      const n = Number(maxAmount);
      if (!Number.isNaN(n)) query = query.lte('amount', n);
    }
    if (q) {
      const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const pattern = `%${esc(q)}%`;
      query = query.or(`label.ilike."${pattern}",counterparty_name.ilike."${pattern}"`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(createPaginatedResponse(data ?? [], count ?? 0, page, limit));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to list bank transactions' }, { status: 500 });
  }
}
