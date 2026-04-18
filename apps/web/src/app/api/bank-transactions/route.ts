import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

type AllocAgg = { bank_transaction_id: number; sum: number; kinds: Set<string> };

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integration_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const reconciled = searchParams.get('reconciled'); // any | fully | partial | none
    const q = searchParams.get('q')?.trim();
    const minAmount = searchParams.get('min_amount');
    const maxAmount = searchParams.get('max_amount');
    const hasEntityType = searchParams.get('has_entity_type')?.trim();
    const sortBy = searchParams.get('sort_by') ?? 'execution_date';
    const sortOrder = searchParams.get('sort_order') ?? 'desc';
    const { page, limit, offset } = getPaginationParams(searchParams);

    const allowedSortColumns = ['execution_date', 'amount', 'label', 'counterparty_name'] as const;
    const column = allowedSortColumns.includes(sortBy as (typeof allowedSortColumns)[number])
      ? sortBy
      : 'execution_date';
    const ascending = sortOrder === 'asc';

    const supabase = supabaseServer();
    let query = supabase
      .from('bank_transactions')
      .select('*', { count: 'exact' })
      .order(column, { ascending });

    if (integrationId) query = query.eq('integration_id', integrationId);
    if (fromDate) query = query.gte('execution_date', fromDate);
    if (toDate) query = query.lte('execution_date', toDate);
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

    // When filtering by reconciliation state or entity kind, we pre-fetch the
    // set of bank_transaction_ids that match, then apply as `in` filter.
    if (hasEntityType || reconciled === 'fully' || reconciled === 'partial' || reconciled === 'none') {
      let allocQ = supabase.from('bank_transaction_allocations').select('bank_transaction_id, entity_type, amount');
      if (hasEntityType) allocQ = allocQ.eq('entity_type', hasEntityType);
      const { data: allocs } = await allocQ;
      const byTx = new Map<number, { sum: number; kinds: Set<string> }>();
      for (const a of allocs ?? []) {
        const row = a as { bank_transaction_id: number; entity_type: string; amount: string | number };
        const cur = byTx.get(row.bank_transaction_id) ?? { sum: 0, kinds: new Set<string>() };
        cur.sum += parseFloat(String(row.amount));
        cur.kinds.add(row.entity_type);
        byTx.set(row.bank_transaction_id, cur);
      }
      const idsWithAlloc = Array.from(byTx.keys());

      if (reconciled === 'none') {
        if (idsWithAlloc.length > 0) query = query.not('id', 'in', `(${idsWithAlloc.join(',')})`);
      } else if (reconciled === 'fully' || reconciled === 'partial') {
        const { data: txRows } = await supabase
          .from('bank_transactions')
          .select('id, amount')
          .in('id', idsWithAlloc.length ? idsWithAlloc : [-1]);
        const matching: number[] = [];
        for (const r of txRows ?? []) {
          const agg = byTx.get((r as { id: number }).id);
          if (!agg) continue;
          const amt = Number((r as { amount: string | number }).amount);
          const full = Math.abs(agg.sum - amt) < 0.005;
          if (reconciled === 'fully' && full) matching.push((r as { id: number }).id);
          if (reconciled === 'partial' && !full) matching.push((r as { id: number }).id);
        }
        query = query.in('id', matching.length ? matching : [-1]);
      } else if (hasEntityType) {
        query = query.in('id', idsWithAlloc.length ? idsWithAlloc : [-1]);
      }
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const ids = rows.map((r) => (r as { id: number }).id);
    let summary = new Map<number, AllocAgg>();
    if (ids.length > 0) {
      const { data: allocs } = await supabase
        .from('bank_transaction_allocations')
        .select('bank_transaction_id, entity_type, amount')
        .in('bank_transaction_id', ids);
      for (const a of allocs ?? []) {
        const row = a as { bank_transaction_id: number; entity_type: string; amount: string | number };
        const cur = summary.get(row.bank_transaction_id) ?? {
          bank_transaction_id: row.bank_transaction_id,
          sum: 0,
          kinds: new Set<string>(),
        };
        cur.sum += parseFloat(String(row.amount));
        cur.kinds.add(row.entity_type);
        summary.set(row.bank_transaction_id, cur);
      }
    }

    const enriched = rows.map((r) => {
      const row = r as { id: number; amount: string | number } & Record<string, unknown>;
      const agg = summary.get(row.id);
      const allocated = agg ? Math.round(agg.sum * 100) / 100 : 0;
      const remaining = Math.round((Number(row.amount) - allocated) * 100) / 100;
      return {
        ...row,
        allocated_total: allocated,
        remaining,
        fully_reconciled: Math.abs(remaining) < 0.005 && allocated !== 0,
        allocation_kinds: agg ? Array.from(agg.kinds) : [],
      };
    });

    return NextResponse.json(createPaginatedResponse(enriched, count ?? 0, page, limit));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to list bank transactions';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
