// Supplier Catalogs API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { SupplierCatalog, CreateSupplierCatalogData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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

function transformToSnakeCase(data: CreateSupplierCatalogData): any {
  return {
    supplier_id: data.supplierId,
    ingredient_id: data.ingredientId,
    supplier_sku: data.supplierSku,
    unit_price: data.unitPrice,
    unit: data.unit,
    minimum_order_quantity: data.minimumOrderQuantity,
    lead_time_days: data.leadTimeDays,
    is_active: data.isActive ?? true,
    effective_date: data.effectiveDate || new Date().toISOString().split('T')[0],
    expiry_date: data.expiryDate,
    notes: data.notes,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const supplierId = searchParams.get('supplierId');
    const ingredientId = searchParams.get('ingredientId');

    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('supplier_catalogs')
      .select('*')
      .order('created_at', { ascending: false });

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }
    if (ingredientId) {
      query = query.eq('ingredient_id', ingredientId);
    }

    const countQuery = query.select('*', { count: 'exact', head: true });
    const dataQuery = query.range(offset, offset + limit - 1);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const catalogs: SupplierCatalog[] = (data || []).map(transformSupplierCatalog);
    const total = count || 0;
    
    return NextResponse.json(createPaginatedResponse(catalogs, total, page, limit));
  } catch (error: any) {
    console.error('Error fetching supplier catalogs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier catalogs', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSupplierCatalogData = await request.json();
    
    if (!body.supplierId || !body.ingredientId || !body.unitPrice || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('supplier_catalogs')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformSupplierCatalog(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier catalog:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier catalog', details: error.message },
      { status: 500 }
    );
  }
}

