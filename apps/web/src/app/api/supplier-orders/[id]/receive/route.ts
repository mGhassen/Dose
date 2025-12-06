// Receive Supplier Order API Route
// Marks order as delivered and creates stock movements for received items

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { SupplierOrderStatus, StockMovementType, StockMovementReferenceType } from '@kit/types';

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
    const body: ReceiveOrderData = await request.json();
    const supabase = createServerSupabaseClient();
    
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
      updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
    }

    const { error: updateError } = await supabase
      .from('supplier_orders')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // Update received quantities and create stock movements
    for (const receiveItem of body.items) {
      // Update received quantity
      const { error: itemUpdateError } = await supabase
        .from('supplier_order_items')
        .update({ received_quantity: receiveItem.receivedQuantity })
        .eq('id', receiveItem.itemId);

      if (itemUpdateError) throw itemUpdateError;

      // Find the order item to get ingredient details
      const orderItem = orderData.items.find((item: any) => item.id === receiveItem.itemId);
      if (!orderItem) continue;

      // Create stock movement for received items
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          ingredient_id: orderItem.ingredient_id,
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

