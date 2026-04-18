import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { parseBody, bankTransactionCreateSaleBodySchema } from '@/shared/zod-schemas';
import type { BankTransactionCreateSaleBody } from '@/shared/zod-schemas';
import { executeBankTransactionSplit } from '@/lib/bank-transactions/execute-split';

/** Thin wrapper: create a new sale and link it to a credit bank transaction. */
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
    const parsed = parseBody(raw, bankTransactionCreateSaleBodySchema);
    if (!parsed.success) return parsed.response;
    const body: BankTransactionCreateSaleBody = parsed.data;

    const supabase = supabaseServer();
    const { data: bankTx } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('id', bankTxId)
      .single();
    if (!bankTx) {
      return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
    }
    const bankAmount = Number(bankTx.amount);
    if (bankAmount <= 0) {
      return NextResponse.json(
        { error: 'Only credit transactions (positive amount) can create a sale' },
        { status: 400 }
      );
    }

    const result = await executeBankTransactionSplit(supabase, Number(bankTxId), {
      lines: [
        {
          kind: 'new_sale',
          amount: bankAmount,
          sale: body,
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
        saleId: alloc?.entity_id ?? null,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create sale from bank transaction';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
