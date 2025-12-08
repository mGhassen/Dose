// Supplier by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Supplier, UpdateSupplierData } from '@kit/types';

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
    supplierType: row.supplier_type || ['supplier'], // Default to ['supplier'] if not set
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateSupplierData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.email !== undefined) result.email = data.email;
  if (data.phone !== undefined) result.phone = data.phone;
  if (data.address !== undefined) result.address = data.address;
  if (data.contactPerson !== undefined) result.contact_person = data.contactPerson;
  if (data.paymentTerms !== undefined) result.payment_terms = data.paymentTerms;
  if (data.notes !== undefined) result.notes = data.notes;
  if (data.supplierType !== undefined) result.supplier_type = data.supplierType;
  if (data.isActive !== undefined) result.is_active = data.isActive;
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
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformSupplier(data));
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier', details: error.message },
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
    const body: UpdateSupplierData = await request.json();
    
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('suppliers')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformSupplier(data));
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier', details: error.message },
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
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier', details: error.message },
      { status: 500 }
    );
  }
}

