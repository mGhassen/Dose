// Supplier Catalog by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SupplierCatalog, UpdateSupplierCatalogData } from '@kit/types';

function transformSupplierCatalog(row: any): SupplierCatalog {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    ingredientId: row.ingredient_id,
    supplierSku: row.supplier_sku,
    unitPrice: parseFloat(row.unit_price),
    unit: row.unit,
    minimumOrderQuantity: row.minimum_order_quantity ? parseFloat(row.minimum_order_quantity) : undefined,
    leadTimeDays: row.lead_time_days,
    isActive: row.is_active,
    effectiveDate: row.effective_date,
    expiryDate: row.expiry_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateSupplierCatalogData): any {
  const result: any = {};
  if (data.supplierId !== undefined) result.supplier_id = data.supplierId;
  if (data.ingredientId !== undefined) result.ingredient_id = data.ingredientId;
  if (data.supplierSku !== undefined) result.supplier_sku = data.supplierSku;
  if (data.unitPrice !== undefined) result.unit_price = data.unitPrice;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.minimumOrderQuantity !== undefined) result.minimum_order_quantity = data.minimumOrderQuantity;
  if (data.leadTimeDays !== undefined) result.lead_time_days = data.leadTimeDays;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.effectiveDate !== undefined) result.effective_date = data.effectiveDate;
  if (data.expiryDate !== undefined) result.expiry_date = data.expiryDate;
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
    
    const { data, error } = await supabase
      .from('supplier_catalogs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Supplier catalog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformSupplierCatalog(data));
  } catch (error: any) {
    console.error('Error fetching supplier catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier catalog', details: error.message },
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
    const body: UpdateSupplierCatalogData = await request.json();
    
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('supplier_catalogs')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Supplier catalog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformSupplierCatalog(data));
  } catch (error: any) {
    console.error('Error updating supplier catalog:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier catalog', details: error.message },
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
      .from('supplier_catalogs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting supplier catalog:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier catalog', details: error.message },
      { status: 500 }
    );
  }
}

