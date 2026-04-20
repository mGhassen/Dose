import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  loadBankTxAllocations,
  withAllocationsSummary,
} from '@/lib/bank-transactions/allocations-summary';
import {
  parseBody,
  bankTransactionSplitSchema,
  type BankTransactionSplitInput,
} from '@/shared/zod-schemas';
import { executeBankTransactionSplit } from '@/lib/bank-transactions/execute-split';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
    }
    const summary = await loadBankTxAllocations(supabase, Number(id), Number(data.amount));
    return NextResponse.json(withAllocationsSummary(data, summary));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to get bank transaction';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
