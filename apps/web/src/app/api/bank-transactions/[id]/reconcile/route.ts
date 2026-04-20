import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  parseBody,
  bankTransactionSplitSchema,
  type BankTransactionSplitInput,
} from '@/shared/zod-schemas';
import { executeBankTransactionSplit } from '@/lib/bank-transactions/execute-split';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bankTxId } = await params;
  const bankTxIdNum = Number(bankTxId);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseBody(raw, bankTransactionSplitSchema);
  if (!parsed.success) return parsed.response;
  const body: BankTransactionSplitInput = parsed.data;

  const supabase = supabaseServer();
  const result = await executeBankTransactionSplit(supabase, bankTxIdNum, body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, details: result.error.details },
      { status: result.error.status }
    );
  }
  return NextResponse.json(
    {
      bankTransaction: result.result.bankTransaction,
      allocations: result.result.inserted,
    },
    { status: 201 }
  );
}
