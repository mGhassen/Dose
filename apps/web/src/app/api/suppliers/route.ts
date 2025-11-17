// Suppliers API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Supplier, CreateSupplierData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    contactPerson: row.contact_person,
    paymentTerms: row.payment_terms,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateSupplierData): any {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    contact_person: data.contactPerson,
    payment_terms: data.paymentTerms,
    notes: data.notes,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    const countQuery = supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });

    const query = supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const suppliers: Supplier[] = (data || []).map(transformSupplier);
    const total = count || 0;
    
    return NextResponse.json(createPaginatedResponse(suppliers, total, page, limit));
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSupplierData = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('suppliers')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformSupplier(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier', details: error.message },
      { status: 500 }
    );
  }
}

