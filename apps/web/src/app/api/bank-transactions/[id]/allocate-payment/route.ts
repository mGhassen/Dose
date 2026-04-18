import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseBody, bankTransactionAllocatePaymentBodySchema } from '@/shared/zod-schemas';
import type { BankTransactionAllocatePaymentBody } from '@/shared/zod-schemas';
import { executeBankTransactionSplit } from '@/lib/bank-transactions/execute-split';

/** Thin wrapper: single-payment allocation on a debit bank transaction. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bankTxId } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parseBody(raw, bankTransactionAllocatePaymentBodySchema);
  if (!parsed.success) return parsed.response;
  const body: BankTransactionAllocatePaymentBody = parsed.data;

  const supabase = supabaseServer();
  const { data: bankTx } = await supabase
    .from('bank_transactions')
    .select('amount')
    .eq('id', bankTxId)
    .single();
  if (!bankTx) {
    return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
  }
  if (Number(bankTx.amount) >= 0) {
    return NextResponse.json(
      { error: 'Only debit transactions can allocate a payment here' },
      { status: 400 }
    );
  }

  const result = await executeBankTransactionSplit(supabase, Number(bankTxId), {
    lines: [
      {
        kind: 'payment',
        amount: -Math.abs(body.amount),
        entryId: body.entryId,
        paymentDate: body.paymentDate,
        paymentMethod: body.paymentMethod,
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
      payment: alloc
        ? {
            id: alloc.entity_id,
            entryId: body.entryId,
            amount: Math.abs(Number(alloc.amount)),
            paymentDate: body.paymentDate,
          }
        : null,
      bankTransaction: result.result.bankTransaction,
      allocation: alloc ?? null,
    },
    { status: 201 }
  );
}
