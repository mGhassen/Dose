// Update Subscription Projection Entry API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export interface UpdateSubscriptionProjectionEntryData {
  amount?: number;
  isPaid?: boolean;
  paidDate?: string | null;
  actualAmount?: number | null;
  notes?: string | null;
}

function transformProjectionEntry(row: any) {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    month: row.month,
    amount: parseFloat(row.amount),
    isProjected: row.is_projected,
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    actualAmount: row.actual_amount ? parseFloat(row.actual_amount) : null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateSubscriptionProjectionEntryData): any {
  const result: any = {};
  if ('amount' in data && data.amount !== undefined) result.amount = data.amount;
  if ('isPaid' in data) result.is_paid = data.isPaid;
  if ('paidDate' in data) result.paid_date = data.paidDate || null;
  if ('actualAmount' in data) result.actual_amount = data.actualAmount !== undefined ? data.actualAmount : null;
  if ('notes' in data) result.notes = data.notes || null;
  return result;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.updateSubscriptionProjectionEntrySchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdateSubscriptionProjectionEntryData;
    const supabase = supabaseServer();
    
    // Verify the projection entry belongs to this subscription
    const { data: existingEntry, error: checkError } = await supabase
      .from('subscription_projection_entries')
      .select('*')
      .eq('id', entryId)
      .eq('subscription_id', id)
      .single();

    if (checkError || !existingEntry) {
      return NextResponse.json(
        { error: 'Subscription projection entry not found' },
        { status: 404 }
      );
    }

    // Update the projection entry
    const { data, error } = await supabase
      .from('subscription_projection_entries')
      .update(transformToSnakeCase(body))
      .eq('id', entryId)
      .eq('subscription_id', id)
      .select()
      .single();

    if (error) throw error;

    // Update corresponding entry if it exists; create when missing so payment + expense can be created
    if (data) {
      let entryData: { id: number } | null = null;
      const { data: foundEntry, error: entryError } = await supabase
        .from('entries')
        .select('id')
        .eq('reference_id', parseInt(id))
        .eq('schedule_entry_id', parseInt(entryId))
        .eq('entry_type', 'subscription_payment')
        .maybeSingle();

      if (!entryError) entryData = foundEntry;

      const derivedDate = body.paidDate || data.paid_date || data.month + '-01';
      if (body.isPaid && !entryData) {
        const { data: subscriptionForEntry } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', parseInt(id))
          .single();
        if (subscriptionForEntry) {
          const { data: newEntry, error: insertErr } = await supabase
            .from('entries')
            .insert({
              direction: 'output',
              entry_type: 'subscription_payment',
              name: `${subscriptionForEntry.name} - ${data.month}`,
              amount: body.amount !== undefined ? body.amount : parseFloat(existingEntry.amount),
              description: body.notes || `Subscription payment for ${data.month}`,
              category: subscriptionForEntry.category,
              vendor: subscriptionForEntry.vendor,
              entry_date: derivedDate,
              due_date: derivedDate,
              reference_id: parseInt(id),
              schedule_entry_id: parseInt(entryId),
              is_active: subscriptionForEntry.is_active,
            })
            .select('id')
            .single();
          if (!insertErr && newEntry) entryData = newEntry;
        }
      }

      if (entryData) {
        if (body.amount !== undefined) {
          await supabase
            .from('entries')
            .update({ amount: body.amount })
            .eq('id', entryData.id);
        }

        // Update the entry's payment status
        // Only create payment if paidDate is provided AND no payments exist yet
        // This prevents duplicate payments when payments are managed separately
        if (body.isPaid !== undefined) {
          const paidDateForPayment = body.paidDate || data.paid_date || data.month + '-01';
          if (body.isPaid && paidDateForPayment) {
            const { data: existingPayments } = await supabase
              .from('payments')
              .select('id')
              .eq('entry_id', entryData.id);

            if (!existingPayments || existingPayments.length === 0) {
              const { data: payments } = await supabase
                .from('payments')
                .select('id')
                .eq('entry_id', entryData.id)
                .eq('payment_date', paidDateForPayment)
                .maybeSingle();

              if (!payments) {
                await supabase
                  .from('payments')
                  .insert({
                    entry_id: entryData.id,
                    payment_date: paidDateForPayment,
                    amount: body.actualAmount || parseFloat(existingEntry.amount),
                    is_paid: true,
                    paid_date: paidDateForPayment,
                    notes: body.notes || null,
                  });
              }
            }
          }

          if (body.isPaid) {
            const expenseDate = body.paidDate || data.paid_date || data.month + '-01';
            const { data: subscriptionData } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('id', parseInt(id))
              .single();

            if (subscriptionData) {
              const { data: existingExpense } = await supabase
                .from('expenses')
                .select('id')
                .eq('subscription_id', parseInt(id))
                .eq('expense_date', expenseDate)
                .maybeSingle();

              if (!existingExpense) {
                const paidAmount = body.actualAmount ?? parseFloat(existingEntry.amount);
                const dateStr = expenseDate.split('T')[0] || expenseDate;
                const { getTaxRateAndRuleForExpenseLine } = await import('@/lib/tax-rules-resolve');
                const { to2Decimals, splitInclusiveTotal } = await import('@/lib/transaction-tax');
                let taxRule: { rate: number; taxInclusive?: boolean };
                if (subscriptionData.item_id != null) {
                  const { data: itemRow } = await supabase.from('items').select('category, created_at').eq('id', subscriptionData.item_id).maybeSingle();
                  taxRule = await getTaxRateAndRuleForExpenseLine(supabase, subscriptionData.item_id, itemRow?.category ?? null, dateStr, itemRow?.created_at ?? null);
                } else {
                  taxRule = await getTaxRateAndRuleForExpenseLine(supabase, null, subscriptionData.category ?? null, dateStr);
                }
                const taxRate = taxRule.rate ?? 0;

                let subTotal: number;
                let taxAmount: number;
                let amount: number;
                if (taxRule.taxInclusive && taxRate > 0) {
                  const split = splitInclusiveTotal(paidAmount, taxRate);
                  subTotal = split.subtotal;
                  taxAmount = split.taxAmount;
                  amount = paidAmount;
                } else {
                  subTotal = paidAmount;
                  taxAmount = to2Decimals(subTotal * (taxRate / 100));
                  amount = to2Decimals(subTotal + taxAmount);
                }

                const expenseData = {
                  name: `${subscriptionData.name} - ${data.month}`,
                  category: subscriptionData.category,
                  expense_type: 'subscription',
                  amount,
                  subscription_id: parseInt(id),
                  expense_date: expenseDate,
                  description: body.notes || `Payment for subscription: ${subscriptionData.name} - ${data.month}`,
                  vendor: subscriptionData.vendor || null,
                  start_date: expenseDate,
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
                    item_id: subscriptionData.item_id ?? null,
                    subscription_id: parseInt(id),
                    quantity: 1,
                    unit_id: null,
                    unit_price: subTotal,
                    unit_cost: null,
                    tax_rate_percent: taxRate,
                    tax_amount: taxAmount,
                    line_total: subTotal,
                    sort_order: 0,
                  });
                  if (subscriptionData.item_id != null) {
                    const { upsertCost } = await import('@/lib/items/price-history-upsert');
                    await upsertCost(supabase, subscriptionData.item_id, expenseDate.split('T')[0] || expenseDate, subTotal);
                  }
                } else if (expenseError) {
                  console.error('Error creating expense for subscription payment:', expenseError);
                }
              }
            }
          } else if (!body.isPaid) {
            const paidDate = existingEntry.paid_date || data.month + '-01';
            const { data: expenses } = await supabase
              .from('expenses')
              .select('id')
              .eq('subscription_id', parseInt(id))
              .eq('expense_date', paidDate)
              .maybeSingle();

            if (expenses) {
              const { error: expenseDeleteError } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenses.id);

              if (expenseDeleteError) {
                console.error('Error deleting expense:', expenseDeleteError);
              }
            }

            const { data: payments } = await supabase
              .from('payments')
              .select('id')
              .eq('entry_id', entryData.id);

            if (payments && payments.length > 0) {
              for (const payment of payments) {
                const { error: paymentDeleteError } = await supabase
                  .from('payments')
                  .delete()
                  .eq('id', payment.id);

                if (paymentDeleteError) {
                  console.error('Error deleting payment:', paymentDeleteError);
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json(transformProjectionEntry(data));
  } catch (error: any) {
    console.error('Error updating subscription projection entry:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription projection entry', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;

    const supabase = supabaseServer();
    
    // Verify the projection entry belongs to this subscription
    const { data: existingEntry } = await supabase
      .from('subscription_projection_entries')
      .select('*')
      .eq('id', entryId)
      .eq('subscription_id', id)
      .single();

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Subscription projection entry not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('subscription_projection_entries')
      .delete()
      .eq('id', entryId)
      .eq('subscription_id', id);

    if (error) throw error;

    // Delete corresponding entry if it exists
    const { data: entryData } = await supabase
      .from('entries')
      .select('id')
      .eq('reference_id', parseInt(id))
      .eq('schedule_entry_id', parseInt(entryId))
      .eq('entry_type', 'subscription_payment')
      .maybeSingle();

    if (entryData) {
      await supabase
        .from('entries')
        .delete()
        .eq('id', entryData.id);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting subscription projection entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription projection entry', details: error.message },
      { status: 500 }
    );
  }
}

