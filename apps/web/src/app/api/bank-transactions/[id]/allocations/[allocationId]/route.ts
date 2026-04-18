import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  loadBankTxAllocations,
  withAllocationsSummary,
} from '@/lib/bank-transactions/allocations-summary';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; allocationId: string }> }
) {
  try {
    const { id, allocationId } = await params;
    const bankTxIdNum = Number(id);
    const allocIdNum = Number(allocationId);
    if (!Number.isFinite(bankTxIdNum) || !Number.isFinite(allocIdNum)) {
      return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: bankTx, error: txErr } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', bankTxIdNum)
      .single();
    if (txErr || !bankTx) {
      return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
    }

    const { data: alloc, error: allocErr } = await supabase
      .from('bank_transaction_allocations')
      .select('*')
      .eq('id', allocIdNum)
      .eq('bank_transaction_id', bankTxIdNum)
      .maybeSingle();
    if (allocErr || !alloc) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    const { error: delErr } = await supabase
      .from('bank_transaction_allocations')
      .delete()
      .eq('id', allocIdNum);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const summary = await loadBankTxAllocations(supabase, bankTxIdNum, Number(bankTx.amount));
    return NextResponse.json(withAllocationsSummary(bankTx, summary));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to delete allocation';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
