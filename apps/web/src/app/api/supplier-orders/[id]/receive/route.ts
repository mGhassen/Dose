// Receive Supplier Order API Route
// Marks order as delivered and creates stock movements for received items

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { ExpenseCategory, SupplierOrderStatus, StockMovementType, StockMovementReferenceType } from '@kit/types';
import { getItemTotalStock } from '@/lib/stock/get-item-stock';
import { getItemCostAsOf } from '@/lib/items/price-resolve';
import {
  convertQuantityWithContext,
  convertUnitPriceWithContext,
  logUnitConversionWarning,
} from "@/lib/units/convert";
import { loadUnitConversionContext } from "@/lib/units/context";

interface ReceiveOrderData {
  actualDeliveryDate?: string;
  items: Array<{
    itemId: number;
    receivedQuantity: number;
    location?: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.receiveOrderSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as ReceiveOrderData;
    const supabase = supabaseServer();
    const conversionContext = await loadUnitConversionContext(supabase);
    
    // Get order and items
    const { data: orderData, error: orderError } = await supabase
      .from('supplier_orders')
      .select('*, items:supplier_order_items(*)')
      .eq('id', id)
      .single();

    if (orderError) throw orderError;
    if (!orderData) {
      return NextResponse.json(
        { error: 'Supplier order not found' },
        { status: 404 }
      );
    }

    const referenceId = Number(id);
    const effectiveDate =
      orderData.actual_delivery_date ?? body.actualDeliveryDate ?? (await import('@kit/lib')).dateToYYYYMMDD(new Date());

    const { data: existingStockMovements } = await supabase
      .from('stock_movements')
      .select('id')
      .eq('reference_type', StockMovementReferenceType.SUPPLIER_ORDER)
      .eq('reference_id', referenceId)
      .limit(1);

    const hasStockMovements = (existingStockMovements || []).length > 0;

    const { data: existingExpenseRow, error: expenseLookupError } = await supabase
      .from('expenses')
      .select('id')
      .eq('supplier_order_id', referenceId)
      .maybeSingle();

    if (expenseLookupError) throw expenseLookupError;

    const existingExpenseId: number | undefined = existingExpenseRow?.id;

    const to2 = (n: number) => Math.round(n * 100) / 100;

    const createExpense = async (itemsToUse: any[]) => {
      const lines = itemsToUse
        .map((orderItem: any, sortIndex: number) => {
          const orderedQty = parseFloat(String(orderItem.quantity)) || 0;
          const receivedQty = parseFloat(String(orderItem.received_quantity ?? 0)) || 0;
          if (receivedQty <= 0) return null;

          const perUnitNet =
            orderedQty > 0 ? (parseFloat(String(orderItem.total_price)) || 0) / orderedQty : 0;
          const perUnitTax =
            orderedQty > 0 ? (parseFloat(String(orderItem.tax_amount ?? 0)) || 0) / orderedQty : 0;

          return {
            sortOrder: sortIndex,
            itemId: orderItem.item_id,
            quantity: receivedQty,
            unitId: orderItem.unit_id ?? null,
            unitPrice: parseFloat(String(orderItem.unit_price)) || 0,
            unitCost: null,
            taxRatePercent: orderItem.tax_rate_percent ?? null,
            taxAmount: perUnitTax * receivedQty,
            lineTotal: perUnitNet * receivedQty,
          };
        })
        .filter(Boolean) as Array<{
          sortOrder: number;
          itemId: number;
          quantity: number;
          unitId: number | null;
          unitPrice: number;
          unitCost: number | null;
          taxRatePercent: number | null;
          taxAmount: number;
          lineTotal: number;
        }>;

      const subtotal = to2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const totalTax = to2(lines.reduce((s, l) => s + l.taxAmount, 0));
      const amount = to2(subtotal + totalTax);

      const { data: expenseRow, error: expenseInsertError } = await supabase
        .from('expenses')
        .insert({
          name: `Supplier order #${orderData.order_number || orderData.id}`,
          category: ExpenseCategory.SUPPLIES,
          expense_type: 'expense',
          supplier_id: orderData.supplier_id,
          expense_date: effectiveDate,
          start_date: effectiveDate,
          description: orderData.notes ?? null,
          amount,
          subtotal,
          total_tax: totalTax,
          total_discount: 0,
          is_active: true,
          supplier_order_id: referenceId,
        })
        .select()
        .single();

      if (expenseInsertError) throw expenseInsertError;
      if (!expenseRow) throw new Error('Failed to create expense');

      if (lines.length > 0) {
        const { error: linesError } = await supabase.from('expense_line_items').insert(
          lines.map((l) => ({
            expense_id: expenseRow.id,
            item_id: l.itemId,
            subscription_id: null,
            quantity: l.quantity,
            unit_id: l.unitId,
            unit_price: l.unitPrice,
            unit_cost: l.unitCost,
            tax_rate_percent: l.taxRatePercent,
            tax_amount: l.taxAmount,
            line_total: l.lineTotal,
            sort_order: l.sortOrder,
          }))
        );
        if (linesError) throw linesError;
      }
    };

    if (hasStockMovements) {
      if (existingExpenseId) {
        const { data: updatedOrder, error: fetchError } = await supabase
          .from('supplier_orders')
          .select('*, items:supplier_order_items(*)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        return NextResponse.json({
          success: true,
          message: 'Order already received. Returning current state.',
          order: updatedOrder,
        });
      }

      const itemsWithReceivedQty = orderData.items.filter((it: any) => {
        const v = parseFloat(String(it.received_quantity)) || 0;
        return v > 0;
      });

      await createExpense(itemsWithReceivedQty);

      const { data: updatedOrder, error: fetchError } = await supabase
        .from('supplier_orders')
        .select('*, items:supplier_order_items(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      return NextResponse.json({
        success: true,
        message: 'Order received. Expense created.',
        order: updatedOrder,
      });
    }

    const orderLines = orderData.items || [];
    const orderLineIds = new Set(orderLines.map((it: { id: number }) => Number(it.id)));
    for (const row of body.items) {
      if (!orderLineIds.has(row.itemId)) {
        return NextResponse.json(
          {
            error: 'Invalid order line',
            details:
              'Order lines changed after this page loaded (e.g. after saving the order). Refresh and receive again.',
          },
          { status: 400 }
        );
      }
    }
    if (body.items.length !== orderLines.length) {
      return NextResponse.json(
        {
          error: 'Invalid receive payload',
          details: 'Include exactly one entry per order line.',
        },
        { status: 400 }
      );
    }

    if (!existingExpenseId) {
      const receivedQtyByOrderItemId = new Map(
        body.items.map((it) => [it.itemId, parseFloat(String(it.receivedQuantity)) || 0])
      );

      const itemsToUse = orderData.items.map((orderItem: any) => ({
        ...orderItem,
        received_quantity: receivedQtyByOrderItemId.get(orderItem.id) ?? 0,
      }));

      await createExpense(itemsToUse);
    }

    const uniqueItemIds = [...new Set(orderData.items.map((item: any) => item.item_id).filter((v: unknown) => typeof v === "number"))] as number[];
    const itemUnitMap = new Map<number, { unitId: number | null }>();
    if (uniqueItemIds.length > 0) {
      const { data: itemRows, error: itemError } = await supabase
        .from("items")
        .select("id, unit_id")
        .in("id", uniqueItemIds);
      if (itemError) throw itemError;
      for (const row of itemRows || []) {
        itemUnitMap.set(row.id, { unitId: row.unit_id ?? null });
      }
    }

    const unitSymbolForMovement = (unitId: number | null): string | undefined => {
      if (unitId == null) return undefined;
      return conversionContext.symbolMap.get(unitId) ?? `unit#${unitId}`;
    };

    for (const receiveItem of body.items) {
      const orderItem = orderData.items.find((item: any) => item.id === receiveItem.itemId);
      if (!orderItem) continue;

      const itemId = orderItem.item_id;
      const receivedQty = parseFloat(String(receiveItem.receivedQuantity)) || 0;
      const unitPriceInOrderUnit = parseFloat(String(orderItem.unit_price)) || 0;
      const orderUnitId = orderItem.unit_id ?? null;
      const itemUnit = itemUnitMap.get(itemId);
      const itemUnitId = itemUnit?.unitId ?? null;
      const orderLineUnitText =
        typeof orderItem.unit === "string" && orderItem.unit.trim() ? orderItem.unit.trim() : "";

      let receivedQtyInItemUnit = receivedQty;
      if (orderUnitId != null && itemUnitId != null) {
        const quantityResult = convertQuantityWithContext(
          receivedQty,
          orderUnitId,
          itemUnitId,
          conversionContext
        );
        receivedQtyInItemUnit = quantityResult.quantity;
        if (quantityResult.warning) {
          logUnitConversionWarning("supplier-order-receive:received-quantity", quantityResult.warning);
        }
      }

      let unitPriceInItemUnit = unitPriceInOrderUnit;
      if (orderUnitId != null && itemUnitId != null) {
        const priceResult = convertUnitPriceWithContext(
          unitPriceInOrderUnit,
          orderUnitId,
          itemUnitId,
          conversionContext
        );
        unitPriceInItemUnit = priceResult.unitPrice;
        if (priceResult.warning) {
          logUnitConversionWarning("supplier-order-receive:unit-price", priceResult.warning);
        }
      }

      const currentStock = await getItemTotalStock(supabase, itemId);
      const costResult = await getItemCostAsOf(supabase, itemId, effectiveDate);
      const currentCost = costResult.unitCost ?? 0;

      const { error: itemUpdateError } = await supabase
        .from('supplier_order_items')
        .update({ received_quantity: receiveItem.receivedQuantity })
        .eq('id', receiveItem.itemId);

      if (itemUpdateError) throw itemUpdateError;

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          item_id: orderItem.item_id,
          movement_type: StockMovementType.IN,
          quantity: receivedQtyInItemUnit,
          unit:
            unitSymbolForMovement(itemUnitId) ??
            unitSymbolForMovement(orderUnitId) ??
            orderLineUnitText,
          unit_id: itemUnitId ?? orderUnitId,
          reference_type: StockMovementReferenceType.SUPPLIER_ORDER,
          reference_id: referenceId,
          location: receiveItem.location || null,
          movement_date: new Date().toISOString(),
          notes: `Received from supplier order #${orderData.order_number || id}`,
        });

      if (movementError) throw movementError;

      if (receivedQtyInItemUnit > 0) {
        const totalQty = currentStock + receivedQtyInItemUnit;
        const newAvg =
          totalQty > 0
            ? (currentStock * currentCost + receivedQtyInItemUnit * unitPriceInItemUnit) / totalQty
            : unitPriceInItemUnit;

        let taxInclusive = false;
        try {
          const { getTaxRateAndRuleForExpenseLineWithItemTaxes } = await import('@/lib/item-taxes-resolve');
          const expenseRule = await getTaxRateAndRuleForExpenseLineWithItemTaxes(
            supabase,
            itemId,
            orderData.category ?? null,
            effectiveDate,
            null
          );
          taxInclusive = expenseRule.taxInclusive === true;
        } catch {
          taxInclusive = false;
        }

        await supabase.from('item_cost_history').insert({
          item_id: itemId,
          effective_date: effectiveDate,
          unit_cost: newAvg,
          tax_included: taxInclusive,
        });
      }
    }

    const { error: finalizeOrderError } = await supabase
      .from('supplier_orders')
      .update({
        status: SupplierOrderStatus.DELIVERED,
        actual_delivery_date: effectiveDate,
      })
      .eq('id', id);

    if (finalizeOrderError) throw finalizeOrderError;

    const { data: updatedOrder, error: fetchError } = await supabase
      .from('supplier_orders')
      .select('*, items:supplier_order_items(*)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ 
      success: true, 
      message: 'Order received successfully. Stock movements created.',
      order: updatedOrder
    });
  } catch (error: any) {
    console.error('Error receiving supplier order:', error);
    return NextResponse.json(
      { error: 'Failed to receive supplier order', details: error.message },
      { status: 500 }
    );
  }
}

