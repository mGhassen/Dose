// Get Subscription Projection Entries API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');
    const supabase = supabaseServer();
    
    let query = supabase
      .from('subscription_projection_entries')
      .select('*')
      .eq('subscription_id', id)
      .order('month', { ascending: true });

    if (startMonth) {
      query = query.gte('month', startMonth);
    }
    if (endMonth) {
      query = query.lte('month', endMonth);
    }

    const { data, error } = await query;

    if (error) throw error;

    const entries = (data || []).map(transformProjectionEntry);

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching subscription projections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription projections', details: error.message },
      { status: 500 }
    );
  }
}

// Create or update a projection entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.subscriptionProjectionPostSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const supabase = supabaseServer();
    
    // Check if entry already exists
    const { data: existing } = await supabase
      .from('subscription_projection_entries')
      .select('*')
      .eq('subscription_id', id)
      .eq('month', body.month)
      .maybeSingle();

    let projectionEntry;
    
    if (existing) {
      // Update existing entry
      const { data, error } = await supabase
        .from('subscription_projection_entries')
        .update({
          amount: body.amount,
          is_projected: body.isProjected !== undefined ? body.isProjected : existing.is_projected,
          is_paid: body.isPaid !== undefined ? body.isPaid : existing.is_paid,
          paid_date: body.paidDate !== undefined ? body.paidDate : existing.paid_date,
          actual_amount: body.actualAmount !== undefined ? body.actualAmount : existing.actual_amount,
          notes: body.notes !== undefined ? body.notes : existing.notes,
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      projectionEntry = data;
      
      // Ensure the entry exists for the projection (needed for payments, even partial ones)
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (subscriptionData) {
        // Check if entry already exists
        const { data: existingEntry } = await supabase
          .from('entries')
          .select('id')
          .eq('reference_id', parseInt(id))
          .eq('schedule_entry_id', projectionEntry.id)
          .eq('entry_type', 'subscription_payment')
          .maybeSingle();

        if (!existingEntry) {
          // Create OUTPUT entry
          // IMPORTANT: entry amount should always be the projected amount (body.amount), not actualAmount
          // actualAmount is only for tracking payments, not for the entry's expected amount
          const { data: entryData, error: entryError } = await supabase
            .from('entries')
            .insert({
              direction: 'output',
              entry_type: 'subscription_payment',
              name: `${subscriptionData.name} - ${body.month}`,
              amount: body.amount, // Always use projected amount, not actualAmount
              description: body.notes || `Subscription payment for ${body.month}`,
              category: subscriptionData.category,
              vendor: subscriptionData.vendor,
              entry_date: body.paidDate || `${body.month}-01`,
              due_date: body.paidDate || `${body.month}-01`,
              reference_id: parseInt(id),
              schedule_entry_id: projectionEntry.id,
              is_active: subscriptionData.is_active,
            })
            .select()
            .single();

          if (entryError) {
            console.error('Error creating entry for subscription projection:', entryError);
            // Continue even if entry creation fails
          }
        }
      }
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('subscription_projection_entries')
        .insert({
          subscription_id: parseInt(id),
          month: body.month,
          amount: body.amount,
          is_projected: body.isProjected !== undefined ? body.isProjected : true,
          is_paid: body.isPaid || false,
          paid_date: body.paidDate || null,
          actual_amount: body.actualAmount || null,
          notes: body.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      projectionEntry = data;
      
      // Always create the entry for the projection (needed for payments, even partial ones)
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (subscriptionData) {
        const { data: existingEntry } = await supabase
          .from('entries')
          .select('id')
          .eq('reference_id', parseInt(id))
          .eq('schedule_entry_id', projectionEntry.id)
          .eq('entry_type', 'subscription_payment')
          .maybeSingle();

        let resolvedEntry: { id: number } | null = existingEntry;

        if (!existingEntry) {
          const { data: insertedEntry, error: entryError } = await supabase
            .from('entries')
            .insert({
              direction: 'output',
              entry_type: 'subscription_payment',
              name: `${subscriptionData.name} - ${body.month}`,
              amount: body.amount,
              description: body.notes || `Subscription payment for ${body.month}`,
              category: subscriptionData.category,
              vendor: subscriptionData.vendor,
              entry_date: body.paidDate || `${body.month}-01`,
              due_date: body.paidDate || `${body.month}-01`,
              reference_id: parseInt(id),
              schedule_entry_id: projectionEntry.id,
              is_active: subscriptionData.is_active,
            })
            .select('id')
            .single();

          if (entryError) {
            console.error('Error creating entry for subscription projection:', entryError);
          } else if (insertedEntry) {
            resolvedEntry = insertedEntry;
          }
        }

        if (body.isPaid && body.paidDate && resolvedEntry) {
          const { data: existingPayments } = await supabase
            .from('payments')
            .select('id')
            .eq('entry_id', resolvedEntry.id);
          if (!existingPayments || existingPayments.length === 0) {
            const { data: existingByDate } = await supabase
              .from('payments')
              .select('id')
              .eq('entry_id', resolvedEntry.id)
              .eq('payment_date', body.paidDate)
              .maybeSingle();
            if (!existingByDate) {
              await supabase
                .from('payments')
                .insert({
                  entry_id: resolvedEntry.id,
                  payment_date: body.paidDate,
                  amount: body.actualAmount || body.amount,
                  is_paid: true,
                  paid_date: body.paidDate,
                  notes: body.notes || null,
                });
            }
          }

          const paidAmount = body.actualAmount ?? body.amount; // TTC
          const expenseDate = body.paidDate || `${body.month}-01`;
          const dateStr = expenseDate.split('T')[0] || expenseDate;
          const { getTaxRateAndRuleForExpenseLineWithItemTaxes } = await import('@/lib/item-taxes-resolve');
          const { to2Decimals, splitInclusiveTotal } = await import('@/lib/transaction-tax');
          let taxRule: { rate: number; taxInclusive?: boolean };
          if (subscriptionData.item_id != null) {
            const { data: itemRow } = await supabase.from('items').select('category, created_at').eq('id', subscriptionData.item_id).maybeSingle();
            taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, subscriptionData.item_id, itemRow?.category ?? null, dateStr, itemRow?.created_at ?? null);
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
          const totalTax = taxAmount;
          const { data: existingExpense } = await supabase
            .from('expenses')
            .select('id')
            .eq('subscription_id', parseInt(id))
            .eq('expense_date', expenseDate)
            .maybeSingle();

          if (!existingExpense) {
            const { data: expenseRow, error: expenseErr } = await supabase
              .from('expenses')
              .insert({
                name: `${subscriptionData.name} - ${body.month}`,
                category: subscriptionData.category,
                expense_type: 'subscription',
                amount,
                subscription_id: parseInt(id),
                expense_date: expenseDate,
                description: body.notes || `Payment for subscription: ${subscriptionData.name} - ${body.month}`,
                vendor: subscriptionData.vendor || null,
                start_date: expenseDate,
                subtotal: subTotal,
                total_tax: totalTax,
                total_discount: 0,
                is_active: true,
              })
              .select()
              .single();

            if (!expenseErr && expenseRow) {
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
                const costUnit =
                  taxRule.taxInclusive === true ? amount : subTotal;
                await upsertCost(
                  supabase,
                  subscriptionData.item_id,
                  expenseDate.split('T')[0] || expenseDate,
                  costUnit,
                  taxRule.taxInclusive === true
                );
              }
            }
          }
        }
      }
    }

    return NextResponse.json(transformProjectionEntry(projectionEntry));
  } catch (error: any) {
    console.error('Error creating/updating subscription projection entry:', error);
    return NextResponse.json(
      { error: 'Failed to create/update subscription projection entry', details: error.message },
      { status: 500 }
    );
  }
}
