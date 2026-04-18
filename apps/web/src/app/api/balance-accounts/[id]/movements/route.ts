import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, createBalanceMovementSchema } from '@/shared/zod-schemas';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { accountId, response } = await resolveAccountId(supabase, request);
    if (!accountId) return response!;

    const { data: acct } = await supabase
      .from('balance_accounts')
      .select('id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (!acct) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('balance_movements')
      .select('*')
      .eq('balance_account_id', id)
      .order('occurred_on', { ascending: false })
      .order('id', { ascending: false });
    if (error) throw error;
    const rows = data || [];
    const ids = rows.map((r) => (r as { id: number }).id);
    const bankMap = new Map<number, number>();
    if (ids.length > 0) {
      const { data: allocs } = await supabase
        .from('bank_transaction_allocations')
        .select('entity_id, bank_transaction_id')
        .eq('entity_type', 'balance_movement')
        .in('entity_id', ids);
      for (const a of allocs ?? []) {
        const row = a as { entity_id: number; bank_transaction_id: number };
        bankMap.set(row.entity_id, row.bank_transaction_id);
      }
    }
    const enriched = rows.map((r) => ({
      ...r,
      bank_transaction_id: bankMap.get((r as { id: number }).id) ?? null,
    }));
    return NextResponse.json(enriched);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list balance movements';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { accountId, response } = await resolveAccountId(supabase, request);
    if (!accountId) return response!;

    const { data: acct } = await supabase
      .from('balance_accounts')
      .select('id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (!acct) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsed = await parseRequestBody(request, createBalanceMovementSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const { data, error } = await supabase
      .from('balance_movements')
      .insert({
        account_id: accountId,
        balance_account_id: Number(id),
        occurred_on: body.occurred_on,
        amount: body.amount,
        label: body.label ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create balance movement';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
