// Supplier Orders API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SupplierOrder, CreateSupplierOrderData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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

function transformToSnakeCase(data: CreateSupplierOrderData): any {
  return {
    supplier_id: data.supplierId,
    order_number: data.orderNumber,
    order_date: data.orderDate || new Date().toISOString().split('T')[0],
    expected_delivery_date: data.expectedDeliveryDate,
    status: data.status || 'pending',
    notes: data.notes,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('supplier_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const countQuery = query.select('*', { count: 'exact', head: true });
    const dataQuery = query.range(offset, offset + limit - 1);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const orders: SupplierOrder[] = (data || []).map(transformSupplierOrder);
    const total = count || 0;
    
    return NextResponse.json(createPaginatedResponse(orders, total, page, limit));
  } catch (error: any) {
    console.error('Error fetching supplier orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier orders', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSupplierOrderData = await request.json();
    
    if (!body.supplierId || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: supplierId and items are required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Calculate total amount
    const totalAmount = body.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('supplier_orders')
      .insert({
        ...transformToSnakeCase(body),
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const orderItems = body.items.map(item => ({
      order_id: orderData.id,
      ingredient_id: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('supplier_order_items')
      .insert(orderItems);

    if (itemsError) {
      // Rollback: delete the order
      await supabase.from('supplier_orders').delete().eq('id', orderData.id);
      throw itemsError;
    }

    return NextResponse.json(transformSupplierOrder(orderData), { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier order:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier order', details: error.message },
      { status: 500 }
    );
  }
}

