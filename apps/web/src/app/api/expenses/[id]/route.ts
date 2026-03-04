// Expense by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Expense, UpdateExpenseData, ExpenseLineItem } from '@kit/types';

function transformLineItem(row: any): ExpenseLineItem {
  const subscription = row.subscription;
  return {
    id: row.id,
    expenseId: row.expense_id,
    itemId: row.item_id ?? undefined,
    subscriptionId: row.subscription_id ?? undefined,
    quantity: parseFloat(row.quantity),
    unitId: row.unit_id ?? undefined,
    unitPrice: parseFloat(row.unit_price),
    unitCost: row.unit_cost != null ? parseFloat(row.unit_cost) : undefined,
    taxRatePercent: row.tax_rate_percent != null ? parseFloat(row.tax_rate_percent) : undefined,
    taxAmount: row.tax_amount != null ? parseFloat(row.tax_amount) : undefined,
    lineTotal: parseFloat(row.line_total),
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    item: row.item,
    subscription: subscription ? { id: subscription.id, name: subscription.name } : undefined,
  };
}

function transformExpense(row: any, lineItems?: ExpenseLineItem[]): Expense {
  const expense: Expense = {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    subscriptionId: row.subscription_id || undefined,
    description: row.description,
    vendor: row.vendor,
    supplierId: row.supplier_id || undefined,
    expenseDate: row.expense_date || row.start_date,
    subtotal: row.subtotal != null ? parseFloat(row.subtotal) : undefined,
    totalTax: row.total_tax != null ? parseFloat(row.total_tax) : undefined,
    totalDiscount: row.total_discount != null ? parseFloat(row.total_discount) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (lineItems?.length) expense.lineItems = lineItems;
  return expense;
}

function transformToSnakeCase(data: UpdateExpenseData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.category !== undefined) result.category = data.category;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.subscriptionId !== undefined) result.subscription_id = data.subscriptionId || null;
  if (data.expenseDate !== undefined) result.expense_date = data.expenseDate;
  if (data.description !== undefined) result.description = data.description;
  if (data.vendor !== undefined) result.vendor = data.vendor; // Keep for backward compatibility
  if (data.supplierId !== undefined) result.supplier_id = data.supplierId || null;
  result.updated_at = new Date().toISOString();
  return result;
}

async function updateExpenseAsTransaction(
  supabase: any,
  id: string,
  body: {
    name: string;
    category: string;
    expenseDate: string;
    description?: string;
    supplierId?: number;
    lineItems: Array<{ itemId?: number; subscriptionId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; taxRatePercent?: number }>;
    discount?: { type: 'amount' | 'percent'; value: number };
  }
) {
  const { getTaxRateFor } = await import('@/lib/tax-rate');
  const dateStr = body.expenseDate.split('T')[0] || body.expenseDate;
  const categoryTaxRate = await getTaxRateFor(supabase, body.category, dateStr);

  const lines: Array<{ itemId?: number; subscriptionId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; lineTotal: number; taxRatePercent: number; taxAmount: number }> = [];
  for (let i = 0; i < body.lineItems.length; i++) {
    const line = body.lineItems[i];
    let taxRate = categoryTaxRate;
    if (line.itemId && !line.subscriptionId) {
      const { data: itemRow } = await supabase.from('items').select('default_tax_rate_percent').eq('id', line.itemId).single();
      if (itemRow?.default_tax_rate_percent != null) taxRate = parseFloat(String(itemRow.default_tax_rate_percent));
    }
    if (line.taxRatePercent != null) taxRate = line.taxRatePercent;
    const qty = typeof line.quantity === 'number' ? line.quantity : parseFloat(String(line.quantity));
    const lineTotal = Math.round(qty * line.unitPrice * 100) / 100;
    const taxAmount = Math.round(lineTotal * (taxRate / 100) * 100) / 100;
    lines.push({
      itemId: line.itemId,
      subscriptionId: line.subscriptionId,
      quantity: qty,
      unitId: line.unitId,
      unitPrice: line.unitPrice,
      unitCost: line.unitCost,
      lineTotal,
      taxRatePercent: taxRate,
      taxAmount,
    });
  }
  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const totalTax = Math.round(lines.reduce((s, l) => s + l.taxAmount, 0) * 100) / 100;
  let discountAmount = 0;
  if (body.discount?.value != null && body.discount.value > 0) {
    if (body.discount.type === 'percent') {
      discountAmount = Math.round(subtotal * (body.discount.value / 100) * 100) / 100;
    } else {
      discountAmount = Math.round(body.discount.value * 100) / 100;
    }
  }
  const amount = Math.round((subtotal + totalTax - discountAmount) * 100) / 100;

  const { data: expenseRow, error: updateError } = await supabase
    .from('expenses')
    .update({
      name: body.name,
      category: body.category,
      expense_date: body.expenseDate,
      description: body.description ?? null,
      supplier_id: body.supplierId ?? null,
      amount,
      subtotal,
      total_tax: totalTax,
      total_discount: discountAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (updateError) throw updateError;

  await supabase.from('expense_line_items').delete().eq('expense_id', id);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await supabase.from('expense_line_items').insert({
      expense_id: id,
      item_id: l.itemId ?? null,
      subscription_id: l.subscriptionId ?? null,
      quantity: l.quantity,
      unit_id: l.unitId ?? null,
      unit_price: l.unitPrice,
      unit_cost: l.unitCost ?? null,
      tax_rate_percent: l.taxRatePercent,
      tax_amount: l.taxAmount,
      line_total: l.lineTotal,
      sort_order: i,
    });
  }

  const { data: entryRow } = await supabase.from('entries').select('id').eq('entry_type', 'expense').eq('reference_id', id).maybeSingle();
  if (entryRow) {
    await supabase.from('entries').update({ amount, updated_at: new Date().toISOString() }).eq('id', entryRow.id);
  }

  const { data: lineRows } = await supabase.from('expense_line_items').select('*, item:items(id, name, category, unit, unit_id, item_type, unit_cost, default_tax_rate_percent), subscription:subscriptions(id, name)').eq('expense_id', id).order('sort_order', { ascending: true });
  const lineItems = (lineRows || []).map(transformLineItem);
  return transformExpense(expenseRow, lineItems);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: expenseRow, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      throw error;
    }

    const { data: lineRows } = await supabase
      .from('expense_line_items')
      .select(`
        *,
        item:items(id, name, category, unit, unit_id, item_type, unit_cost, default_tax_rate_percent),
        subscription:subscriptions(id, name)
      `)
      .eq('expense_id', id)
      .order('sort_order', { ascending: true });

    const lineItems = (lineRows || []).map(transformLineItem);
    return NextResponse.json(transformExpense(expenseRow, lineItems));
  } catch (error: any) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense', details: error.message },
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
    const body = await request.json();

    if (Array.isArray(body.lineItems) && body.lineItems.length > 0) {
      if (!body.name || !body.category || !body.expenseDate) {
        return NextResponse.json(
          { error: 'Missing required fields: name, category, expenseDate' },
          { status: 400 }
        );
      }
      const supabase = createServerSupabaseClient();
      const updated = await updateExpenseAsTransaction(supabase, id, {
        name: body.name,
        category: body.category,
        expenseDate: body.expenseDate,
        description: body.description,
        supplierId: body.supplierId,
        lineItems: body.lineItems,
        discount: body.discount,
      });
      return NextResponse.json(updated);
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('expenses')
      .update(transformToSnakeCase(body as UpdateExpenseData))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      throw error;
    }

    const { data: lineRows } = await supabase.from('expense_line_items').select('*, item:items(id, name, category, unit, unit_id, item_type, unit_cost, default_tax_rate_percent)').eq('expense_id', id).order('sort_order', { ascending: true });
    const lineItems = (lineRows || []).map(transformLineItem);
    return NextResponse.json(transformExpense(data, lineItems));
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense', details: error.message },
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
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense', details: error.message },
      { status: 500 }
    );
  }
}

