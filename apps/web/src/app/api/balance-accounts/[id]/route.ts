import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseRequestBody, updateBalanceAccountSchema } from '@/shared/zod-schemas';

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
      .from('balance_accounts')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: movs } = await supabase
      .from('balance_movements')
      .select('amount')
      .eq('balance_account_id', id);

    let balance = 0;
    for (const m of movs || []) balance += parseFloat(String(m.amount));

    return NextResponse.json({
      ...data,
      balance: Math.round(balance * 100) / 100,
      movements_count: (movs || []).length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch balance account';
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

    const parsed = await parseRequestBody(request, updateBalanceAccountSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.kind !== undefined) update.kind = body.kind;
    if (body.currency !== undefined) update.currency = body.currency;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.archived_at !== undefined) update.archived_at = body.archived_at;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('balance_accounts')
      .update(update)
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update balance account';
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

    const { count } = await supabase
      .from('balance_movements')
      .select('id', { count: 'exact', head: true })
      .eq('balance_account_id', id);

    if (count && count > 0) {
      const { error } = await supabase
        .from('balance_accounts')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
        .eq('account_id', accountId);
      if (error) throw error;
      return NextResponse.json({ softDeleted: true, movementsCount: count });
    }

    const { error } = await supabase
      .from('balance_accounts')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete balance account';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
