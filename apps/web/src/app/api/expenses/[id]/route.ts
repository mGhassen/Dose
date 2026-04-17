// Expense by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Expense, UpdateExpenseData, ExpenseLineItem } from '@kit/types';
import { parseRequestBody, updateExpenseSchema, type PaymentSliceInput } from '@/shared/zod-schemas';
import { toPositiveItemId } from '@/lib/merge-selector-items';
import { paymentSlicesSumMatchesTotal, replacePaymentsForEntry } from '@/lib/ledger/replace-entry-payments';
import { hydrateExpenseLineItemItems } from '@/lib/expenses/hydrate-expense-line-item-items';
import { replaceExpenseStockMovements } from '@/lib/expenses/replace-expense-stock-movements';

function transformLineItem(row: any): ExpenseLineItem {
  const subscription = row.subscription;
  const rawItem = row.item;
  const item = Array.isArray(rawItem) ? rawItem[0] ?? undefined : rawItem;
  return {
    id: row.id,
    expenseId: row.expense_id,
    itemId: toPositiveItemId(row.item_id),
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
    item,
    subscription: subscription ? { id: subscription.id, name: subscription.name } : undefined,
  };
}

function transformExpense(row: any, lineItems?: ExpenseLineItem[]): Expense {
  const expense: Expense = {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    expenseType: (row.expense_type || 'expense') as Expense['expenseType'],
    subscriptionId: row.subscription_id || undefined,
    description: row.description,
    vendor: row.vendor,
    supplierId: row.supplier_id || undefined,
    supplierOrderId: row.supplier_order_id != null ? parseFloat(row.supplier_order_id) : undefined,
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
  if (data.expenseType !== undefined) result.expense_type = data.expenseType;
  if (data.subscriptionId !== undefined) result.subscription_id = data.subscriptionId || null;
  if (data.expenseDate !== undefined) result.expense_date = data.expenseDate;
  if (data.description !== undefined) result.description = data.description;
  if (data.vendor !== undefined) result.vendor = data.vendor;
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
    supplierOrderId?: number | null;
    lineItems: Array<{
      itemId?: number;
      subscriptionId?: number;
      quantity: number;
      unitId?: number;
      unitPrice: number;
      unitCost?: number;
      taxRatePercent?: number;
      taxInclusive?: boolean;
    }>;
    discount?: { type: 'amount' | 'percent'; value: number };
    paymentSlices?: PaymentSliceInput[] | null;
  }
) {
  const { getTaxRateAndRuleForExpenseLineWithItemTaxes } = await import('@/lib/item-taxes-resolve');
  const { lineTaxAmount, to2Decimals } = await import('@/lib/transaction-tax');
  const dateStr = body.expenseDate.split('T')[0] || body.expenseDate;

  const lines: Array<{ itemId?: number; subscriptionId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; lineTotal: number; taxRatePercent: number; taxAmount: number }> = [];
  for (let i = 0; i < body.lineItems.length; i++) {
    const line = body.lineItems[i];
    let taxRate: number;
    let taxInclusive = false;
    if (line.subscriptionId) {
      const { data: sub } = await supabase.from('subscriptions').select('item_id, category').eq('id', line.subscriptionId).maybeSingle();
      if (sub?.item_id != null) {
        const { data: itemRow } = await supabase
          .from('items')
          .select('created_at, category:item_categories(name)')
          .eq('id', sub.item_id)
          .maybeSingle();
        const itemCategoryName = ((itemRow as any)?.category?.name) ?? null;
        const taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, sub.item_id, itemCategoryName, dateStr, (itemRow as any)?.created_at ?? null);
        taxRate = taxRule.rate ?? 0;
        taxInclusive = line.taxInclusive ?? taxRule.taxInclusive ?? false;
      } else {
        const taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, null, sub?.category ?? null, dateStr);
        taxRate = taxRule.rate ?? 0;
        taxInclusive = line.taxInclusive ?? taxRule.taxInclusive ?? false;
      }
    } else if (line.itemId) {
      const { data: itemRow } = await supabase
        .from('items')
        .select('created_at, category:item_categories(name)')
        .eq('id', line.itemId)
        .maybeSingle();
      const itemCategoryName = ((itemRow as any)?.category?.name) ?? null;
      const taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, line.itemId, itemCategoryName, dateStr, (itemRow as any)?.created_at ?? null);
      taxRate = taxRule.rate ?? 0;
      taxInclusive = line.taxInclusive ?? taxRule.taxInclusive ?? false;
    } else {
      const taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, null, null, dateStr);
      taxRate = taxRule.rate ?? 0;
      taxInclusive = line.taxInclusive ?? taxRule.taxInclusive ?? false;
    }
    if (line.taxRatePercent != null) taxRate = line.taxRatePercent;
    const qty = typeof line.quantity === 'number' ? line.quantity : parseFloat(String(line.quantity));
    const { lineTotalNet, taxAmount } = lineTaxAmount(qty, line.unitPrice, taxRate, taxInclusive);
    const lineTotal = to2Decimals(lineTotalNet);
    lines.push({
      itemId: line.itemId,
      subscriptionId: line.subscriptionId,
      quantity: qty,
      unitId: line.unitId,
      unitPrice: line.unitPrice,
      unitCost: line.unitCost,
      lineTotal,
      taxRatePercent: taxRate,
      taxAmount: to2Decimals(taxAmount),
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

  if (body.supplierOrderId != null) {
    const { data: conflict } = await supabase
      .from('expenses')
      .select('id')
      .eq('supplier_order_id', body.supplierOrderId)
      .neq('id', id)
      .maybeSingle();
    if (conflict) throw new Error('Supplier order already linked to another expense');
  }

  const expensePatch: Record<string, unknown> = {
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
  };
  if (body.supplierOrderId !== undefined) {
    expensePatch.supplier_order_id = body.supplierOrderId;
  }

  const { data: expenseRow, error: updateError } = await supabase
    .from('expenses')
    .update(expensePatch)
    .eq('id', id)
    .select()
    .single();
  if (updateError) throw updateError;

  await supabase.from('expense_line_items').delete().eq('expense_id', id);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await supabase.from('expense_line_items').insert({
      expense_id: id,
      item_id: l.subscriptionId != null ? null : (l.itemId ?? null),
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

  if (entryRow && body.paymentSlices != null) {
    if (!paymentSlicesSumMatchesTotal(body.paymentSlices, amount)) {
      throw new Error('Payment slices must sum to expense total');
    }
    const { error: payErr } = await replacePaymentsForEntry(supabase, entryRow.id, body.paymentSlices);
    if (payErr) throw new Error(payErr);
  }

  const stockRes = await replaceExpenseStockMovements(supabase, {
    expenseId: Number(id),
    supplierOrderId: expenseRow.supplier_order_id ?? null,
    lines,
    movementDate: body.expenseDate,
  });
  if (!stockRes.ok) throw new Error(stockRes.message);

  const { data: lineRows } = await supabase
    .from('expense_line_items')
    .select('*, subscription:subscriptions(id, name)')
    .eq('expense_id', id)
    .order('sort_order', { ascending: true });
  const lineItems = await hydrateExpenseLineItemItems(supabase, (lineRows || []).map(transformLineItem));
  return transformExpense(expenseRow, lineItems);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();

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
      .select('*, subscription:subscriptions(id, name)')
      .eq('expense_id', id)
      .order('sort_order', { ascending: true });

    const lineItems = await hydrateExpenseLineItemItems(supabase, (lineRows || []).map(transformLineItem));
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
    const parsed = await parseRequestBody(request, updateExpenseSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    if (Array.isArray(body.lineItems) && body.lineItems.length > 0) {
      const supabase = supabaseServer();
      const updated = await updateExpenseAsTransaction(supabase, id, {
        name: body.name!,
        category: body.category!,
        expenseDate: body.expenseDate!,
        description: body.description,
        supplierId: body.supplierId,
        supplierOrderId: body.supplierOrderId,
        lineItems: body.lineItems,
        discount: body.discount,
        paymentSlices: body.paymentSlices,
      });
      return NextResponse.json(updated);
    }

    const supabase = supabaseServer();
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

    const { data: lineRows } = await supabase
      .from('expense_line_items')
      .select('*, subscription:subscriptions(id, name)')
      .eq('expense_id', id)
      .order('sort_order', { ascending: true });
    const lineItems = await hydrateExpenseLineItemItems(supabase, (lineRows || []).map(transformLineItem));
    return NextResponse.json(transformExpense(data, lineItems));
  } catch (error: any) {
    console.error('Error updating expense:', error);
    const msg = error?.message || String(error);
    if (msg === 'Payment slices must sum to expense total') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to update expense', details: msg },
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

    const { error: movementError } = await supabase
      .from('stock_movements')
      .delete()
      .eq('reference_type', 'expense')
      .eq('reference_id', Number(id));

    if (movementError) throw movementError;

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

