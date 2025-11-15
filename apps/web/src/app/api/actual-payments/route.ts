// Actual Payments API Route
// Tracks real payments vs projections for loans, leasing, expenses

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export interface ActualPayment {
  id: number;
  paymentType: 'loan' | 'leasing' | 'expense' | 'subscription';
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
  paymentType: 'loan' | 'leasing' | 'expense' | 'subscription';
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

    const supabase = createServerSupabaseClient();
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
    const body: CreateActualPaymentData = await request.json();

    const supabase = createServerSupabaseClient();
    
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
        // Create an expense entry linked to this subscription
        const expenseData = {
          name: `${subscription.name} - Payment ${body.month}`,
          category: subscription.category,
          amount: body.amount,
          subscription_id: body.referenceId,
          expense_date: body.paymentDate,
          description: body.notes || `Payment for subscription: ${subscription.name}`,
          vendor: subscription.vendor || null,
        };

        const { error: expenseError } = await supabase
          .from('expenses')
          .insert(expenseData);

        if (expenseError) {
          console.error('Error creating expense for subscription payment:', expenseError);
          // Don't fail the payment creation if expense creation fails
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

