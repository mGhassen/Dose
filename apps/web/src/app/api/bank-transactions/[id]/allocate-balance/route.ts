import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseBody, allocateBankToBalanceSchema } from '@/shared/zod-schemas';
import type { AllocateBankToBalanceInput } from '@/shared/zod-schemas';
import { executeBankTransactionSplit } from '@/lib/bank-transactions/execute-split';

/** Thin wrapper: allocate the full (or a specified sub-amount) to a balance account. */
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
    const { data: bankTx } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('id', bankTxId)
      .single();
    if (!bankTx) {
      return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
    }

    const amount = body.amount ?? Number(bankTx.amount);

    const result = await executeBankTransactionSplit(supabase, Number(bankTxId), {
      lines: [
        {
          kind: 'balance_movement',
          amount,
          balanceAccountId: body.balance_account_id,
          label: body.label ?? null,
          notes: body.notes ?? null,
        },
      ],
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message, details: result.error.details },
        { status: result.error.status }
      );
    }

    const alloc = result.result.inserted[0];
    return NextResponse.json(
      {
        bankTransaction: result.result.bankTransaction,
        allocation: alloc ?? null,
        movement: alloc ? { id: alloc.entity_id, amount: alloc.amount } : null,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to allocate balance';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
