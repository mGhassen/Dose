import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import {
  StockMovementType,
  StockMovementReferenceType,
  SupplierOrderStatus,
} from '@kit/types';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (expenseError) {
      if (expenseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      throw expenseError;
    }

    if (expense.supplier_order_id != null) {
      return NextResponse.json(
        { error: 'Expense is already linked to a supplier order' },
        { status: 400 }
      );
    }
    if (expense.supplier_id == null) {
      return NextResponse.json(
        { error: 'Expense must have a supplier before creating a supplier order' },
        { status: 400 }
      );
    }

    const { data: lineRows, error: linesError } = await supabase
      .from('expense_line_items')
      .select('*')
      .eq('expense_id', id)
      .order('sort_order', { ascending: true });
    if (linesError) throw linesError;

    const usableLines = (lineRows || []).filter(
      (r: any) =>
        r.item_id != null &&
        r.subscription_id == null &&
        (parseFloat(String(r.quantity)) || 0) > 0
    );

    const hasItemLines = usableLines.length > 0;
    const expenseDate: string = expense.expense_date;

    const { data: orderRow, error: orderError } = await supabase
      .from('supplier_orders')
      .insert({
        supplier_id: expense.supplier_id,
        order_date: expenseDate,
        expected_delivery_date: expenseDate,
        actual_delivery_date: hasItemLines ? expenseDate : null,
        status: hasItemLines ? SupplierOrderStatus.DELIVERED : SupplierOrderStatus.PENDING,
        notes: expense.description ?? null,
        total_amount: expense.amount,
      })
      .select()
      .single();

    if (orderError) throw orderError;
    if (!orderRow) throw new Error('Failed to create supplier order');

    let insertedOrderItems: any[] = [];
    if (hasItemLines) {
      const orderItemsPayload = usableLines.map((r: any) => {
        const qty = parseFloat(String(r.quantity)) || 0;
        const unitPrice = parseFloat(String(r.unit_price)) || 0;
        const lineTotal = parseFloat(String(r.line_total)) || qty * unitPrice;
        const taxAmount = r.tax_amount != null ? parseFloat(String(r.tax_amount)) : null;
        const taxRate = r.tax_rate_percent != null ? parseFloat(String(r.tax_rate_percent)) : null;
        return {
          order_id: orderRow.id,
          item_id: r.item_id,
          quantity: qty,
          unit: 'unit',
          unit_id: r.unit_id ?? null,
          unit_price: unitPrice,
          total_price: lineTotal,
          received_quantity: qty,
          tax_rate_percent: taxRate,
          tax_amount: taxAmount,
          notes: null,
        };
      });

      const { data: inserted, error: orderItemsError } = await supabase
        .from('supplier_order_items')
        .insert(orderItemsPayload)
        .select();

      if (orderItemsError) {
        await supabase.from('supplier_orders').delete().eq('id', orderRow.id);
        throw orderItemsError;
      }
      insertedOrderItems = inserted ?? [];
    }

    const { error: deleteMovementsError } = await supabase
      .from('stock_movements')
      .delete()
      .eq('reference_type', StockMovementReferenceType.EXPENSE)
      .eq('reference_id', Number(id));

    if (deleteMovementsError) {
      await supabase.from('supplier_orders').delete().eq('id', orderRow.id);
      throw deleteMovementsError;
    }

    const movementsPayload = (insertedOrderItems || []).map((oi: any) => ({
      item_id: oi.item_id,
      movement_type: StockMovementType.IN,
      quantity: oi.received_quantity,
      unit: oi.unit ?? 'unit',
      unit_id: oi.unit_id ?? null,
      reference_type: StockMovementReferenceType.SUPPLIER_ORDER,
      reference_id: orderRow.id,
      movement_date: expenseDate,
      notes: `Received from supplier order #${orderRow.order_number || orderRow.id}`,
    }));

    if (movementsPayload.length > 0) {
      const { error: movementsError } = await supabase
        .from('stock_movements')
        .insert(movementsPayload);
      if (movementsError) {
        await supabase.from('supplier_orders').delete().eq('id', orderRow.id);
        throw movementsError;
      }
    }

    const { error: linkError } = await supabase
      .from('expenses')
      .update({ supplier_order_id: orderRow.id, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (linkError) {
      await supabase.from('supplier_orders').delete().eq('id', orderRow.id);
      throw linkError;
    }

    return NextResponse.json(
      {
        id: orderRow.id,
        supplierId: orderRow.supplier_id,
        orderNumber: orderRow.order_number,
        orderDate: orderRow.order_date,
        expectedDeliveryDate: orderRow.expected_delivery_date,
        actualDeliveryDate: orderRow.actual_delivery_date,
        status: orderRow.status,
        totalAmount: orderRow.total_amount ? parseFloat(orderRow.total_amount) : undefined,
        notes: orderRow.notes,
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating supplier order from expense:', error);
    return NextResponse.json(
      {
        error: 'Failed to create supplier order from expense',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
