import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createBalanceAccountSchema } from '@/shared/zod-schemas';

async function resolveAccountId(
  supabase: ReturnType<typeof supabaseServer>,
  request: NextRequest
): Promise<{ accountId: string | null; response?: NextResponse }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { accountId: null, response: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }) };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return { accountId: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!account) {
    return { accountId: null, response: NextResponse.json({ error: 'Account not found' }, { status: 404 }) };
  }
  return { accountId: account.id as string };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { accountId, response } = await resolveAccountId(supabase, request);
    if (!accountId) return response!;

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === '1';
    const kind = searchParams.get('kind')?.trim();

    let query = supabase
      .from('balance_accounts')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    if (!includeArchived) query = query.is('archived_at', null);
    if (kind) query = query.eq('kind', kind);

    const { data: accounts, error } = await query;
    if (error) throw error;

    const ids = (accounts || []).map((a) => a.id);
    const totals = new Map<number, { balance: number; count: number }>();
    if (ids.length > 0) {
      const { data: movs } = await supabase
        .from('balance_movements')
        .select('balance_account_id, amount')
        .in('balance_account_id', ids);
      for (const m of movs || []) {
        const t = totals.get(m.balance_account_id) || { balance: 0, count: 0 };
        t.balance += parseFloat(String(m.amount));
        t.count += 1;
        totals.set(m.balance_account_id, t);
      }
    }

    const withTotals = (accounts || []).map((a) => {
      const t = totals.get(a.id) || { balance: 0, count: 0 };
      return {
        ...a,
        balance: Math.round(t.balance * 100) / 100,
        movements_count: t.count,
      };
    });

    return NextResponse.json(withTotals);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list balance accounts';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { accountId, response } = await resolveAccountId(supabase, request);
    if (!accountId) return response!;

    const parsed = await parseRequestBody(request, createBalanceAccountSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const { data, error } = await supabase
      .from('balance_accounts')
      .insert({
        account_id: accountId,
        name: body.name,
        kind: body.kind,
        currency: body.currency ?? 'EUR',
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ...data, balance: 0, movements_count: 0 }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create balance account';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
