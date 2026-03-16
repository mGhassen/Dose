// Actual Payments API Route
// Tracks real payments vs projections for loans, leasing, expenses

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export interface ActualPayment {
  id: number;
  paymentType: 'loan' | 'leasing' | 'expense' | 'subscription' | 'sale';
  direction: 'input' | 'output'; // 'input' for money coming in, 'output' for money going out
  referenceId: number;
  scheduleEntryId?: number;
  month: string; // YYYY-MM
  paymentDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActualPaymentData {
  paymentType: 'loan' | 'leasing' | 'expense' | 'subscription' | 'sale';
  direction: 'input' | 'output'; // 'input' for money coming in, 'output' for money going out
  referenceId: number;
  scheduleEntryId?: number;
  month: string;
  paymentDate: string;
  amount: number;
  isPaid?: boolean;
  paidDate?: string;
  notes?: string;
}

function transformActualPayment(row: any): ActualPayment {
  return {
    id: row.id,
    paymentType: row.payment_type,
    direction: row.direction || 'output', // Default to 'output' for backward compatibility
    referenceId: row.reference_id,
    scheduleEntryId: row.schedule_entry_id,
    month: row.month,
    paymentDate: row.payment_date,
    amount: parseFloat(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateActualPaymentData): any {
  return {
    payment_type: data.paymentType,
    direction: data.direction || 'output', // Default to 'output' if not specified
    reference_id: data.referenceId,
    schedule_entry_id: data.scheduleEntryId || null,
    month: data.month,
    payment_date: data.paymentDate,
    amount: data.amount,
    is_paid: data.isPaid !== undefined ? data.isPaid : true,
    paid_date: data.paidDate || null,
    notes: data.notes || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentType = searchParams.get('paymentType');
    const referenceId = searchParams.get('referenceId');
    const scheduleEntryId = searchParams.get('scheduleEntryId');
    const month = searchParams.get('month');

    const supabase = supabaseServer();
    let query = supabase.from('actual_payments').select('*');

    if (paymentType) {
      query = query.eq('payment_type', paymentType);
    }
    if (referenceId) {
      query = query.eq('reference_id', referenceId);
    }
    if (scheduleEntryId) {
      query = query.eq('schedule_entry_id', scheduleEntryId);
    }
    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query.order('payment_date', { ascending: true });

    if (error) throw error;

    const payments: ActualPayment[] = (data || []).map(transformActualPayment);

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error('Error fetching actual payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actual payments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.createActualPaymentSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as CreateActualPaymentData;

    const supabase = supabaseServer();
    
    // Create the actual payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from('actual_payments')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (paymentError) throw paymentError;

    // If this is a subscription payment, automatically create an expense entry
    if (body.paymentType === 'subscription') {
      // Fetch the subscription to get its details
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', body.referenceId)
        .single();

      if (!subscriptionError && subscription) {
        const { getTaxRateAndRuleForExpenseLineWithItemTaxes } = await import('@/lib/item-taxes-resolve');
        const { to2Decimals, splitInclusiveTotal } = await import('@/lib/transaction-tax');
        const dateStr = (body.paymentDate || '').split('T')[0] || body.paymentDate;
        let taxRule: { rate: number; taxInclusive?: boolean };
        if (subscription.item_id != null) {
          const { data: itemRow } = await supabase.from('items').select('category, created_at').eq('id', subscription.item_id).maybeSingle();
          taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, subscription.item_id, itemRow?.category ?? null, dateStr, itemRow?.created_at ?? null);
        } else {
          taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, null, subscription.category ?? null, dateStr);
        }
        const taxRate = taxRule.rate ?? 0;

        const gross = body.amount; // TTC
        let subTotal: number;
        let taxAmount: number;
        if (taxRate > 0) {
          const split = splitInclusiveTotal(gross, taxRate);
          subTotal = split.subtotal;
          taxAmount = split.taxAmount;
        } else {
          subTotal = gross;
          taxAmount = 0;
        }
        const amount = gross;

        const expenseData = {
          name: `${subscription.name} - Payment ${body.month}`,
          category: subscription.category,
          expense_type: 'subscription',
          amount,
          subscription_id: body.referenceId,
          expense_date: body.paymentDate,
          actual_payment_id: paymentData.id,
          description: body.notes || `Payment for subscription: ${subscription.name}`,
          vendor: subscription.vendor || null,
          start_date: body.paymentDate,
          subtotal: subTotal,
          total_tax: taxAmount,
          total_discount: 0,
          is_active: true,
        };

        const { data: expenseRow, error: expenseError } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select()
          .single();

        if (!expenseError && expenseRow) {
          await supabase.from('expense_line_items').insert({
            expense_id: expenseRow.id,
            item_id: subscription.item_id ?? null,
            subscription_id: body.referenceId,
            quantity: 1,
            unit_id: null,
            unit_price: subTotal,
            unit_cost: null,
            tax_rate_percent: taxRate,
            tax_amount: taxAmount,
            line_total: subTotal,
            sort_order: 0,
          });
        if (subscription.item_id != null) {
          const { upsertCost } = await import('@/lib/items/price-history-upsert');
          const costUnit =
            taxRule.taxInclusive === true ? amount : subTotal;
          await upsertCost(
            supabase,
            subscription.item_id,
            body.paymentDate.split('T')[0] || body.paymentDate,
            costUnit,
            taxRule.taxInclusive === true
          );
        }
        } else if (expenseError) {
          console.error('Error creating expense for subscription payment:', expenseError);
        }
      }
    }

    return NextResponse.json(transformActualPayment(paymentData), { status: 201 });
  } catch (error: any) {
    console.error('Error creating actual payment:', error);
    return NextResponse.json(
      { error: 'Failed to create actual payment', details: error.message },
      { status: 500 }
    );
  }
}

