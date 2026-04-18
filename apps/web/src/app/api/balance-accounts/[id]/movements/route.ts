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
    return NextResponse.json(data || []);
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

    if (body.bank_transaction_id != null) {
      const { data: bankTx } = await supabase
        .from('bank_transactions')
        .select('id, account_id, reconciled_entity_type, reconciled_entity_id')
        .eq('id', body.bank_transaction_id)
        .maybeSingle();
      if (!bankTx || bankTx.account_id !== accountId) {
        return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
      }
      if (bankTx.reconciled_entity_type && bankTx.reconciled_entity_id != null) {
        return NextResponse.json(
          { error: 'Bank transaction is already reconciled; clear reconciliation first' },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('balance_movements')
      .insert({
        account_id: accountId,
        balance_account_id: Number(id),
        occurred_on: body.occurred_on,
        amount: body.amount,
        label: body.label ?? null,
        notes: body.notes ?? null,
        bank_transaction_id: body.bank_transaction_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    if (body.bank_transaction_id != null) {
      await supabase
        .from('bank_transactions')
        .update({
          reconciled_entity_type: 'balance_movement',
          reconciled_entity_id: data.id,
        })
        .eq('id', body.bank_transaction_id);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create balance movement';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
