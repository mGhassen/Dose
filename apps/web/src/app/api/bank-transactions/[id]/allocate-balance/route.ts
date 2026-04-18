import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseBody, allocateBankToBalanceSchema } from '@/shared/zod-schemas';
import type { AllocateBankToBalanceInput } from '@/shared/zod-schemas';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bankTxId } = await params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = parseBody(raw, allocateBankToBalanceSchema);
    if (!parsed.success) return parsed.response;
    const body: AllocateBankToBalanceInput = parsed.data;

    const supabase = supabaseServer();

    const { data: bankTx, error: txErr } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', bankTxId)
      .single();
    if (txErr || !bankTx) {
      return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
    }

    if (bankTx.reconciled_entity_type && bankTx.reconciled_entity_id != null) {
      return NextResponse.json(
        { error: 'Bank transaction is already reconciled; clear reconciliation first' },
        { status: 409 }
      );
    }

    const { data: balAccount, error: balErr } = await supabase
      .from('balance_accounts')
      .select('id, account_id, archived_at')
      .eq('id', body.balance_account_id)
      .maybeSingle();
    if (balErr || !balAccount) {
      return NextResponse.json({ error: 'Balance account not found' }, { status: 404 });
    }
    if (balAccount.account_id !== bankTx.account_id) {
      return NextResponse.json({ error: 'Balance account does not belong to this workspace' }, { status: 403 });
    }
    if (balAccount.archived_at) {
      return NextResponse.json({ error: 'Balance account is archived' }, { status: 400 });
    }

    const { data: movement, error: movErr } = await supabase
      .from('balance_movements')
      .insert({
        account_id: bankTx.account_id,
        balance_account_id: balAccount.id,
        occurred_on: bankTx.execution_date,
        amount: bankTx.amount,
        label: body.label ?? bankTx.label ?? null,
        notes: body.notes ?? null,
        bank_transaction_id: bankTx.id,
      })
      .select()
      .single();
    if (movErr || !movement) {
      return NextResponse.json(
        { error: 'Failed to create balance movement', details: movErr?.message },
        { status: 500 }
      );
    }

    const { data: updatedTx, error: patchErr } = await supabase
      .from('bank_transactions')
      .update({
        reconciled_entity_type: 'balance_movement',
        reconciled_entity_id: movement.id,
      })
      .eq('id', bankTxId)
      .select()
      .single();
    if (patchErr || !updatedTx) {
      await supabase.from('balance_movements').delete().eq('id', movement.id);
      return NextResponse.json(
        { error: 'Movement created but reconciliation failed', details: patchErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ bankTransaction: updatedTx, movement }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to allocate balance';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
