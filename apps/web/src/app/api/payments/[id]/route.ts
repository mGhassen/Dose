import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Payment, UpdatePaymentData } from '../route';
import { parseRequestBody, updatePaymentSchema } from '@/shared/zod-schemas';

async function getPaymentBankTxId(
  supabase: ReturnType<typeof supabaseServer>,
  paymentId: number
): Promise<number | null> {
  const { data } = await supabase
    .from('bank_transaction_allocations')
    .select('bank_transaction_id')
    .eq('entity_type', 'payment')
    .eq('entity_id', paymentId)
    .maybeSingle();
  return data ? Number((data as { bank_transaction_id: number }).bank_transaction_id) : null;
}

function transformPayment(row: any, bankTransactionId?: number | null): Payment {
  return {
    id: row.id,
    entryId: row.entry_id,
    paymentDate: row.payment_date,
    amount: parseFloat(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    paymentMethod: row.payment_method,
    notes: row.notes,
    bankTransactionId: bankTransactionId != null ? Number(bankTransactionId) : undefined,
    paymentGroupId: row.payment_group_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdatePaymentData): any {
  const result: any = {};
  if (data.entryId !== undefined) result.entry_id = data.entryId;
  if (data.paymentDate !== undefined) result.payment_date = data.paymentDate;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.isPaid !== undefined) result.is_paid = data.isPaid;
  if (data.paidDate !== undefined) result.paid_date = data.paidDate;
  if (data.paymentMethod !== undefined) result.payment_method = data.paymentMethod;
  if (data.notes !== undefined) result.notes = data.notes;
  if (data.paymentGroupId !== undefined) result.payment_group_id = data.paymentGroupId;
  return result;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { data, error } = await supabase.from('payments').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    const bankTxId = await getPaymentBankTxId(supabase, Number(id));
    return NextResponse.json(transformPayment(data, bankTxId));
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await parseRequestBody(request, updatePaymentSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdatePaymentData;

    const supabase = supabaseServer();

    const { data: existing, error: exErr } = await supabase
      .from('payments')
      .select('id, amount')
      .eq('id', id)
      .single();
    if (exErr || !existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const currentBankTxId = await getPaymentBankTxId(supabase, Number(id));
    const nextBankId =
      body.bankTransactionId !== undefined ? body.bankTransactionId : currentBankTxId;
    const nextAmount = body.amount !== undefined ? body.amount : parseFloat(String(existing.amount));

    const { data, error } = await supabase
      .from('payments')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (body.bankTransactionId !== undefined || body.amount !== undefined) {
      if (currentBankTxId !== null && currentBankTxId !== nextBankId) {
        await supabase
          .from('bank_transaction_allocations')
          .delete()
          .eq('entity_type', 'payment')
          .eq('entity_id', id);
      }
      if (nextBankId != null) {
        const { data: bt } = await supabase
          .from('bank_transactions')
          .select('account_id, amount')
          .eq('id', nextBankId)
          .single();
        if (!bt) {
          return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
        }
        const signed = Math.abs(nextAmount) * (Math.sign(Number(bt.amount)) || -1);
        if (currentBankTxId === nextBankId) {
          const { error: updErr } = await supabase
            .from('bank_transaction_allocations')
            .update({ amount: signed })
            .eq('entity_type', 'payment')
            .eq('entity_id', id);
          if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
        } else {
          const { error: insErr } = await supabase.from('bank_transaction_allocations').insert({
            account_id: bt.account_id,
            bank_transaction_id: nextBankId,
            entity_type: 'payment',
            entity_id: Number(id),
            amount: signed,
          });
          if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
        }
      }
    }

    return NextResponse.json(transformPayment(data, nextBankId));
  } catch (error: any) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();

    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, entry_id, payment_date')
      .eq('id', id)
      .single();
    if (fetchError || !payment) {
      if (fetchError?.code === 'PGRST116') {
        return new NextResponse(null, { status: 204 });
      }
      throw fetchError ?? new Error('Payment not found');
    }

    const { data: entry } = await supabase
      .from('entries')
      .select('id, reference_id, entry_type')
      .eq('id', payment.entry_id)
      .single();

    if (entry?.entry_type === 'subscription_payment' && entry.reference_id != null && payment.payment_date) {
      const { count } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('entry_id', payment.entry_id);
      if (count === 1) {
        await supabase
          .from('expenses')
          .delete()
          .eq('subscription_id', entry.reference_id)
          .eq('expense_date', payment.payment_date);
      }
    }

    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment', details: error.message },
      { status: 500 }
    );
  }
}
