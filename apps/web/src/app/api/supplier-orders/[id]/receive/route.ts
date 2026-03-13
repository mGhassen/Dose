// Receive Supplier Order API Route
// Marks order as delivered and creates stock movements for received items

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { SupplierOrderStatus, StockMovementType, StockMovementReferenceType } from '@kit/types';
import { getItemTotalStock } from '@/lib/stock/get-item-stock';
import { getItemCostAsOf } from '@/lib/items/price-resolve';

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

    // Update order status and delivery date
    const updateData: any = {
      status: SupplierOrderStatus.DELIVERED,
    };
    
    if (body.actualDeliveryDate) {
      updateData.actual_delivery_date = body.actualDeliveryDate;
    } else {
      updateData.actual_delivery_date = (await import('@kit/lib')).dateToYYYYMMDD(new Date());
    }

    const { error: updateError } = await supabase
      .from('supplier_orders')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    const effectiveDate =
      body.actualDeliveryDate ?? (await import('@kit/lib')).dateToYYYYMMDD(new Date());

    for (const receiveItem of body.items) {
      const orderItem = orderData.items.find((item: any) => item.id === receiveItem.itemId);
      if (!orderItem) continue;

      const itemId = orderItem.item_id;
      const receivedQty = parseFloat(String(receiveItem.receivedQuantity)) || 0;
      const unitPrice = parseFloat(String(orderItem.unit_price)) || 0;

      const currentStock = await getItemTotalStock(supabase, itemId);
      const currentCost =
        (await getItemCostAsOf(supabase, itemId, effectiveDate)) ?? 0;

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
          quantity: receiveItem.receivedQuantity,
          unit: orderItem.unit,
          reference_type: StockMovementReferenceType.SUPPLIER_ORDER,
          reference_id: Number(id),
          location: receiveItem.location || null,
          movement_date: new Date().toISOString(),
          notes: `Received from supplier order #${orderData.order_number || id}`,
        });

      if (movementError) throw movementError;

      if (receivedQty > 0) {
        const totalQty = currentStock + receivedQty;
        const newAvg =
          totalQty > 0
            ? (currentStock * currentCost + receivedQty * unitPrice) / totalQty
            : unitPrice;

        await supabase.from('item_cost_history').insert({
          item_id: itemId,
          effective_date: effectiveDate,
          unit_cost: newAvg,
        });
      }
    }

    // Get updated order
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

