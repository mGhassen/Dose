import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, updateBalanceMovementSchema } from '@/shared/zod-schemas';

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
    const { data, error } = await supabase
      .from('balance_movements')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch balance movement';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { accountId, response } = await resolveAccountId(supabase, request);
    if (!accountId) return response!;

    const parsed = await parseRequestBody(request, updateBalanceMovementSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const update: Record<string, unknown> = {};
    if (body.occurred_on !== undefined) update.occurred_on = body.occurred_on;
    if (body.amount !== undefined) update.amount = body.amount;
    if (body.label !== undefined) update.label = body.label;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.bank_transaction_id !== undefined) update.bank_transaction_id = body.bank_transaction_id;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('balance_movements')
      .update(update)
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update balance movement';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(request, ctx);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { accountId, response } = await resolveAccountId(supabase, request);
    if (!accountId) return response!;

    const { data: existing } = await supabase
      .from('balance_movements')
      .select('id, bank_transaction_id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (existing.bank_transaction_id != null) {
      await supabase
        .from('bank_transactions')
        .update({
          reconciled_entity_type: null,
          reconciled_entity_id: null,
        })
        .eq('id', existing.bank_transaction_id)
        .eq('reconciled_entity_type', 'balance_movement')
        .eq('reconciled_entity_id', Number(id));
    }

    const { error } = await supabase
      .from('balance_movements')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete balance movement';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
