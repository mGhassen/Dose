// Personnel by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Personnel, UpdatePersonnelData } from '@kit/types';

function transformPersonnel(row: any): Personnel {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    position: row.position,
    type: row.type,
    baseSalary: parseFloat(row.base_salary),
    employerCharges: parseFloat(row.employer_charges),
    employerChargesType: row.employer_charges_type,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdatePersonnelData): any {
  const result: any = {};
  if (data.firstName !== undefined) result.first_name = data.firstName;
  if (data.lastName !== undefined) result.last_name = data.lastName;
  if (data.email !== undefined) result.email = data.email;
  if (data.position !== undefined) result.position = data.position;
  if (data.type !== undefined) result.type = data.type;
  if (data.baseSalary !== undefined) result.base_salary = data.baseSalary;
  if (data.employerCharges !== undefined) result.employer_charges = data.employerCharges;
  if (data.employerChargesType !== undefined) result.employer_charges_type = data.employerChargesType;
  if (data.startDate !== undefined) result.start_date = data.startDate;
  if (data.endDate !== undefined) result.end_date = data.endDate;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.notes !== undefined) result.notes = data.notes;
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
      .from('personnel')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Personnel not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformPersonnel(data));
  } catch (error: any) {
    console.error('Error fetching personnel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personnel', details: error.message },
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
    const body: UpdatePersonnelData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('personnel')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Personnel not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformPersonnel(data));
  } catch (error: any) {
    console.error('Error updating personnel:', error);
    return NextResponse.json(
      { error: 'Failed to update personnel', details: error.message },
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
      .from('personnel')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting personnel:', error);
    return NextResponse.json(
      { error: 'Failed to delete personnel', details: error.message },
      { status: 500 }
    );
  }
}

