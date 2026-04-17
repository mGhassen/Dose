// Payment by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Payment, UpdatePaymentData } from '../route';
import { parseRequestBody, updatePaymentSchema } from '@/shared/zod-schemas';

function transformPayment(row: any): Payment {
  return {
    id: row.id,
    entryId: row.entry_id,
    paymentDate: row.payment_date,
    amount: parseFloat(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    paymentMethod: row.payment_method,
    notes: row.notes,
    bankTransactionId: row.bank_transaction_id != null ? Number(row.bank_transaction_id) : undefined,
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
  if (data.bankTransactionId !== undefined) result.bank_transaction_id = data.bankTransactionId;
  if (data.paymentGroupId !== undefined) result.payment_group_id = data.paymentGroupId;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformPayment(data));
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
      .select('id, amount, bank_transaction_id')
      .eq('id', id)
      .single();
    if (exErr || !existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const nextBankId =
      body.bankTransactionId !== undefined
        ? body.bankTransactionId
        : existing.bank_transaction_id != null
          ? Number(existing.bank_transaction_id)
          : null;
    const nextAmount =
      body.amount !== undefined ? body.amount : parseFloat(String(existing.amount));

    if (nextBankId != null) {
      const { data: bt } = await supabase.from('bank_transactions').select('amount').eq('id', nextBankId).single();
      if (!bt) {
        return NextResponse.json({ error: 'Bank transaction not found' }, { status: 404 });
      }
      const { data: slices } = await supabase
        .from('payments')
        .select('id, amount')
        .eq('bank_transaction_id', nextBankId);
      let sumExisting = 0;
      for (const r of slices || []) {
        if (Number(r.id) === Number(id)) continue;
        sumExisting += parseFloat(String(r.amount));
      }
      const cap = Math.abs(parseFloat(String(bt.amount)));
      if (sumExisting + nextAmount > cap + 0.005) {
        return NextResponse.json(
          {
            error: `Allocations for this bank line exceed its amount (cap ${cap.toFixed(2)}, other slices ${sumExisting.toFixed(2)})`,
          },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformPayment(data));
  } catch (error: any) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
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

