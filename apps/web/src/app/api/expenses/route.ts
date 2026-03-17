// Expenses API Route
// Handles CRUD operations for expenses

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Expense, CreateExpenseData, PaginatedResponse, ExpenseLineItem } from '@kit/types';
import { StockMovementType, StockMovementReferenceType } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';
import { z } from "zod";
import { parseBody, createExpenseTransactionSchema, createExpenseSchema, type CreateExpenseTransactionInput, type CreateExpenseInput } from '@/shared/zod-schemas';

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

function transformToSnakeCase(data: CreateExpenseData): any {
  return {
    name: data.name,
    category: data.category,
    amount: data.amount,
    expense_type: data.expenseType ?? 'expense',
    subscription_id: data.subscriptionId || null,
    description: data.description,
    vendor: data.vendor,
    supplier_id: data.supplierId || null,
    expense_date: data.expenseDate,
    start_date: data.expenseDate,
    is_active: true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = supabaseServer();
    
    // Build base query for counting
    let countQuery = supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });

    // Build query for data
    let query = supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('expense_date', startDate).lte('expense_date', endDate);
      countQuery = countQuery.gte('expense_date', startDate).lte('expense_date', endDate);
    } else if (year) {
      const yStart = `${year}-01-01`;
      const yEnd = `${year}-12-31`;
      query = query.gte('expense_date', yStart).lte('expense_date', yEnd);
      countQuery = countQuery.gte('expense_date', yStart).lte('expense_date', yEnd);
    }

    if (category) {
      query = query.eq('category', category);
      countQuery = countQuery.eq('category', category);
    }

    if (month) {
      // Filter expenses by expense_date in this month
      const startOfMonth = month + '-01';
      const endOfMonth = new Date(month + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0); // Last day of month
      const lastDayOfMonth = endOfMonth.toISOString().split('T')[0];

      query = query
        .gte('expense_date', startOfMonth)
        .lte('expense_date', lastDayOfMonth);
      countQuery = countQuery
        .gte('expense_date', startOfMonth)
        .lte('expense_date', lastDayOfMonth);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const expenses: Expense[] = (data || []).map((row) => transformExpense(row));
    const total = count || 0;
    
    const response: PaginatedResponse<Expense> = createPaginatedResponse(
      expenses,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const schema = Array.isArray((raw as any)?.lineItems) && (raw as any).lineItems.length > 0
      ? createExpenseTransactionSchema
      : createExpenseSchema;
    const parsed = parseBody(raw, schema as z.ZodType<CreateExpenseTransactionInput | CreateExpenseInput>);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    if ('lineItems' in body && Array.isArray(body.lineItems) && body.lineItems.length > 0) {
      const txBody = body as import('@/shared/zod-schemas').CreateExpenseTransactionInput;
      const supabase = supabaseServer();
      const { getTaxRateAndRuleForExpenseLineWithItemTaxes } = await import('@/lib/item-taxes-resolve');
      const { lineTaxAmount, to2Decimals } = await import('@/lib/transaction-tax');
      const dateStr = (txBody.expenseDate || '').split('T')[0] || txBody.expenseDate;

      const lines: Array<{ itemId?: number; subscriptionId?: number; quantity: number; unitId?: number; unitPrice: number; unitCost?: number; lineTotal: number; taxRatePercent: number; taxAmount: number }> = [];
      for (let i = 0; i < txBody.lineItems.length; i++) {
        const line = txBody.lineItems[i];
        let taxRate: number;
        let taxInclusive = false;
        if (line.subscriptionId) {
          const { data: sub } = await supabase.from('subscriptions').select('item_id, category').eq('id', line.subscriptionId).maybeSingle();
          if (sub?.item_id != null) {
            const { data: itemRow } = await supabase.from('items').select('category, created_at').eq('id', sub.item_id).maybeSingle();
            const taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, sub.item_id, itemRow?.category ?? null, dateStr, itemRow?.created_at ?? null);
            taxRate = taxRule.rate ?? 0;
            taxInclusive = line.taxInclusive ?? taxRule.taxInclusive ?? false;
          } else {
            const taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, null, sub?.category ?? null, dateStr);
            taxRate = taxRule.rate ?? 0;
            taxInclusive = line.taxInclusive ?? taxRule.taxInclusive ?? false;
          }
        } else if (line.itemId) {
          const { data: itemRow } = await supabase.from('items').select('category, created_at').eq('id', line.itemId).maybeSingle();
          const taxRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(supabase, line.itemId, itemRow?.category ?? null, dateStr, itemRow?.created_at ?? null);
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
      if (txBody.discount?.value != null && txBody.discount.value > 0) {
        if (txBody.discount.type === 'percent') {
          discountAmount = Math.round(subtotal * (txBody.discount.value / 100) * 100) / 100;
        } else {
          discountAmount = Math.round(txBody.discount.value * 100) / 100;
        }
      }
      const amount = Math.round((subtotal + totalTax - discountAmount) * 100) / 100;

      const { data: expenseRow, error: insertError } = await supabase
        .from('expenses')
        .insert({
          name: txBody.name,
          category: txBody.category,
          expense_type: 'expense',
          expense_date: txBody.expenseDate,
          description: txBody.description ?? null,
          supplier_id: txBody.supplierId ?? null,
          start_date: txBody.expenseDate,
          amount,
          subtotal,
          total_tax: totalTax,
          total_discount: discountAmount,
          is_active: true,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await supabase.from('expense_line_items').insert({
          expense_id: expenseRow.id,
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

      const { error: entryError } = await supabase.from('entries').insert({
        direction: 'output',
        entry_type: 'expense',
        name: txBody.name,
        amount,
        description: txBody.description,
        category: txBody.category,
        supplier_id: txBody.supplierId ?? null,
        entry_date: txBody.expenseDate,
        reference_id: expenseRow.id,
        is_active: true,
      });
      if (entryError) console.error('Error creating entry for expense:', entryError);

      const itemIds = [...new Set(lines.filter((l) => l.itemId != null && l.quantity > 0).map((l) => l.itemId!))];
      if (itemIds.length > 0) {
        const { data: items } = await supabase.from('items').select('id, unit').in('id', itemIds);
        const unitByItemId = new Map((items || []).map((i) => [i.id, i.unit || 'unit']));
        for (const l of lines) {
          if (!l.itemId || l.quantity <= 0) continue;
          const unit = unitByItemId.get(l.itemId) ?? 'unit';
          const { error: outError } = await supabase.from('stock_movements').insert({
            item_id: l.itemId,
            movement_type: StockMovementType.OUT,
            quantity: l.quantity,
            unit,
            reference_type: StockMovementReferenceType.EXPENSE,
            reference_id: expenseRow.id,
            movement_date: txBody.expenseDate,
            notes: `Expense #${expenseRow.id}`,
          });
          if (outError) console.error('Stock movement error:', outError);
        }
      }

      const { data: lineRows } = await supabase.from('expense_line_items').select('*, item:items(id, name, category, unit, unit_id, item_type), subscription:subscriptions(id, name)').eq('expense_id', expenseRow.id).order('sort_order', { ascending: true });
      const lineItems = (lineRows || []).map(transformLineItem);
      return NextResponse.json(transformExpense(expenseRow, lineItems), { status: 201 });
    }

    const bodyLegacy = body as unknown as CreateExpenseData;

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('expenses')
      .insert(transformToSnakeCase(bodyLegacy))
      .select()
      .single();

    if (error) throw error;

    const { error: entryError } = await supabase
      .from('entries')
      .insert({
        direction: 'output',
        entry_type: 'expense',
        name: bodyLegacy.name,
        amount: bodyLegacy.amount,
        description: bodyLegacy.description,
        category: bodyLegacy.category,
        vendor: bodyLegacy.vendor,
        supplier_id: bodyLegacy.supplierId || null,
        entry_date: bodyLegacy.expenseDate,
        reference_id: data.id,
        is_active: true,
      });

    if (entryError) {
      console.error('Error creating entry for expense:', entryError);
    }

    const { data: lineRows } = await supabase.from('expense_line_items').select('*, item:items(id, name, category, unit, unit_id, item_type), subscription:subscriptions(id, name)').eq('expense_id', data.id).order('sort_order', { ascending: true });
    const lineItems = (lineRows || []).map(transformLineItem);
    return NextResponse.json(transformExpense(data, lineItems), { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense', details: error.message },
      { status: 500 }
    );
  }
}

