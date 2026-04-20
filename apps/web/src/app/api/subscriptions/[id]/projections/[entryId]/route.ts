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

async function ensureExpenseLedgerPayment(
  supabase: ReturnType<typeof supabaseServer>,
  expense: {
    id: number;
    name?: string | null;
    amount: number;
    description?: string | null;
    category?: string | null;
    vendor?: string | null;
    supplier_id?: number | null;
    expense_date?: string | null;
    is_active?: boolean | null;
  },
  payment: { amount: number; paymentDate: string; notes?: string | null }
) {
  let entryId: number | null = null;
  const { data: existingEntry } = await supabase
    .from('entries')
    .select('id')
    .eq('entry_type', 'expense')
    .eq('reference_id', expense.id)
    .maybeSingle();
  entryId = existingEntry?.id ?? null;

  if (entryId == null) {
    const { data: createdEntry, error: createEntryError } = await supabase
      .from('entries')
      .insert({
        direction: 'output',
        entry_type: 'expense',
        name: expense.name ?? 'Subscription expense',
        amount: expense.amount,
        description: expense.description ?? null,
        category: expense.category ?? null,
        vendor: expense.vendor ?? null,
        supplier_id: expense.supplier_id ?? null,
        entry_date: expense.expense_date ?? payment.paymentDate,
        reference_id: expense.id,
        is_active: expense.is_active ?? true,
      })
      .select('id')
      .single();
    if (createEntryError || !createdEntry?.id) {
      console.error('Error creating expense entry for subscription payment:', createEntryError);
      return;
    }
    entryId = createdEntry.id;
  }

  const paymentDate = payment.paymentDate.split('T')[0] || payment.paymentDate;
  const { data: dupPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('entry_id', entryId)
    .eq('payment_date', paymentDate)
    .eq('amount', payment.amount)
    .maybeSingle();
  if (dupPayment) return;

  const { error: paymentError } = await supabase.from('payments').insert({
    entry_id: entryId,
    payment_date: paymentDate,
    amount: payment.amount,
    is_paid: true,
    paid_date: paymentDate,
    notes: payment.notes ?? null,
  });
  if (paymentError) {
    console.error('Error creating payment for subscription expense:', paymentError);
  }
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

        if (body.isPaid !== undefined) {
          const paidDateForPayment = body.paidDate || data.paid_date || data.month + '-01';
          if (body.isPaid && paidDateForPayment) {
            const sliceAmount = body.actualAmount ?? parseFloat(existingEntry.amount);
            const { data: dup } = await supabase
              .from('payments')
              .select('id')
              .eq('entry_id', entryData.id)
              .eq('payment_date', paidDateForPayment)
              .eq('amount', sliceAmount)
              .maybeSingle();

            if (!dup) {
              await supabase.from('payments').insert({
                entry_id: entryData.id,
                payment_date: paidDateForPayment,
                amount: sliceAmount,
                is_paid: true,
                paid_date: paidDateForPayment,
                notes: body.notes || null,
              });
            }
          }

          if (body.isPaid) {
            const expenseDateRaw = body.paidDate || data.paid_date || data.month + '-01';
            const expenseDate = expenseDateRaw.split('T')[0] || expenseDateRaw;
            const { data: subscriptionData } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('id', parseInt(id))
              .single();

            if (subscriptionData) {
              const { data: existingMonthExpense } = await supabase
                .from('expenses')
                .select('id')
                .eq('subscription_id', parseInt(id))
                .eq('expense_date', expenseDate)
                .maybeSingle();

              if (existingMonthExpense) {
                const paidAmount = body.actualAmount ?? parseFloat(existingEntry.amount);
                const { data: existingExpense } = await supabase
                  .from('expenses')
                  .select('id, name, amount, description, category, vendor, supplier_id, expense_date, is_active')
                  .eq('id', existingMonthExpense.id)
                  .single();
                if (existingExpense) {
                  await ensureExpenseLedgerPayment(supabase, existingExpense, {
                    amount: paidAmount,
                    paymentDate: expenseDate,
                    notes: body.notes || null,
                  });
                }
              } else {
              const paidAmount = body.actualAmount ?? parseFloat(existingEntry.amount); // TTC
              const dateStr = expenseDate;
              const { getTaxRateAndRuleForExpenseLineWithItemTaxes } = await import('@/lib/item-taxes-resolve');
              const { to2Decimals, splitInclusiveTotal } = await import('@/lib/transaction-tax');
              let taxRule: { rate: number; taxInclusive?: boolean };
              if (subscriptionData.item_id != null) {
                const { data: itemRow } = await supabase
                  .from('items')
                  .select('created_at, category:item_categories(name)')
                  .eq('id', subscriptionData.item_id)
                  .maybeSingle();
                const itemCategoryName = ((itemRow as any)?.category?.name) ?? null;
                taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, subscriptionData.item_id, itemCategoryName, dateStr, (itemRow as any)?.created_at ?? null);
              } else {
                taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, null, subscriptionData.category ?? null, dateStr);
              }
              const taxRate = taxRule.rate ?? 0;

              let subTotal: number;
              let taxAmount: number;
              if (taxRate > 0) {
                const split = splitInclusiveTotal(paidAmount, taxRate);
                subTotal = split.subtotal;
                taxAmount = split.taxAmount;
              } else {
                subTotal = paidAmount;
                taxAmount = 0;
              }
              const amount = paidAmount;

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
                await ensureExpenseLedgerPayment(supabase, expenseRow, {
                  amount,
                  paymentDate: expenseDate,
                  notes: body.notes || null,
                });
                if (subscriptionData.item_id != null) {
                  const { upsertCost } = await import('@/lib/items/price-history-upsert');
                  const costUnit =
                    taxRule.taxInclusive === true ? amount : subTotal;
                  await upsertCost(
                    supabase,
                    subscriptionData.item_id,
                    expenseDate,
                    costUnit,
                    taxRule.taxInclusive === true
                  );
                }
              } else if (expenseError) {
                console.error('Error creating expense for subscription payment:', expenseError);
                return NextResponse.json(
                  { error: 'Failed to create expense for subscription payment', details: expenseError.message },
                  { status: 500 }
                );
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

