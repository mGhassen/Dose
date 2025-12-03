// Vendor by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Vendor, UpdateVendorData } from '@kit/types';

function transformVendor(row: any): Vendor {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    contactPerson: row.contact_person,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateVendorData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.email !== undefined) result.email = data.email;
  if (data.phone !== undefined) result.phone = data.phone;
  if (data.address !== undefined) result.address = data.address;
  if (data.contactPerson !== undefined) result.contact_person = data.contactPerson;
  if (data.notes !== undefined) result.notes = data.notes;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  result.updated_at = new Date().toISOString();
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
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformVendor(data));
  } catch (error: any) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor', details: error.message },
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
    const body: UpdateVendorData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('vendors')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformVendor(data));
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor', details: error.message },
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
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor', details: error.message },
      { status: 500 }
    );
  }
}

