// Supplier Order by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SupplierOrder, SupplierOrderItem, UpdateSupplierOrderData } from '@kit/types';

function transformSupplierOrder(row: any): SupplierOrder {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    expectedDeliveryDate: row.expected_delivery_date,
    actualDeliveryDate: row.actual_delivery_date,
    status: row.status,
    totalAmount: row.total_amount ? parseFloat(row.total_amount) : undefined,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformSupplierOrderItem(row: any): SupplierOrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    itemId: row.item_id,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    unitPrice: parseFloat(row.unit_price),
    totalPrice: parseFloat(row.total_price),
    receivedQuantity: row.received_quantity ? parseFloat(row.received_quantity) : undefined,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateSupplierOrderData): any {
  const result: any = {};
  if (data.supplierId !== undefined) result.supplier_id = data.supplierId;
  if (data.orderNumber !== undefined) result.order_number = data.orderNumber;
  if (data.orderDate !== undefined) result.order_date = data.orderDate;
  if (data.expectedDeliveryDate !== undefined) result.expected_delivery_date = data.expectedDeliveryDate;
  if (data.actualDeliveryDate !== undefined) result.actual_delivery_date = data.actualDeliveryDate;
  if (data.status !== undefined) result.status = data.status;
  if (data.notes !== undefined) result.notes = data.notes;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    // Get order
    const { data: orderData, error: orderError } = await supabase
      .from('supplier_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError) throw orderError;
    if (!orderData) {
      return NextResponse.json(
        { error: 'Supplier order not found' },
        { status: 404 }
      );
    }

    // Get order items with item details
    const { data: itemsData, error: itemsError } = await supabase
      .from('supplier_order_items')
      .select(`
        *,
        item:items(*)
      `)
      .eq('order_id', id);

    if (itemsError) throw itemsError;

    const order: SupplierOrder = {
      ...transformSupplierOrder(orderData),
      items: (itemsData || []).map(item => ({
        ...transformSupplierOrderItem(item),
        item: item.item ? {
          id: item.item.id,
          name: item.item.name,
          description: item.item.description,
          unit: item.item.unit,
          category: item.item.category,
          itemType: item.item.item_type || 'item',
          isActive: item.item.is_active,
          createdAt: item.item.created_at,
          updatedAt: item.item.updated_at,
        } : undefined,
      })),
    };

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error fetching supplier order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier order', details: error.message },
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
    const body: UpdateSupplierOrderData = await request.json();
    const supabase = createServerSupabaseClient();
    
    // Update order
    const updateData = transformToSnakeCase(body);
    
    // Calculate total if items are being updated
    if (body.items) {
      const totalAmount = body.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
      updateData.total_amount = totalAmount;
    }

    const { data: orderData, error: orderError } = await supabase
      .from('supplier_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (orderError) throw orderError;
    if (!orderData) {
      return NextResponse.json(
        { error: 'Supplier order not found' },
        { status: 404 }
      );
    }

    // Update items if provided
    if (body.items !== undefined) {
      // Delete existing items
      await supabase
        .from('supplier_order_items')
        .delete()
        .eq('order_id', id);

      // Insert new items
      if (body.items.length > 0) {
        const orderItems = body.items.map(item => ({
          order_id: Number(id),
          item_id: item.itemId,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          total_price: item.quantity * item.unitPrice,
          notes: item.notes,
        }));

        const { error: itemsError } = await supabase
          .from('supplier_order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }
    }

    return NextResponse.json(transformSupplierOrder(orderData));
  } catch (error: any) {
    console.error('Error updating supplier order:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier order', details: error.message },
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
    
    // Order items will be deleted via CASCADE
    const { error } = await supabase
      .from('supplier_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting supplier order:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier order', details: error.message },
      { status: 500 }
    );
  }
}

