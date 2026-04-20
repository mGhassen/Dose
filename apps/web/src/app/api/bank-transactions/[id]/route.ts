import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  loadBankTxAllocations,
  withAllocationsSummary,
} from '@/lib/bank-transactions/allocations-summary';

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
