// Personnel API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Personnel, CreatePersonnelData } from '@kit/types';

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

function transformToSnakeCase(data: CreatePersonnelData): any {
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    position: data.position,
    type: data.type,
    base_salary: data.baseSalary,
    employer_charges: data.employerCharges,
    employer_charges_type: data.employerChargesType,
    start_date: data.startDate,
    end_date: data.endDate,
    is_active: data.isActive ?? true,
    notes: data.notes,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const personnel: Personnel[] = (data || []).map(transformPersonnel);
    
    return NextResponse.json(personnel);
  } catch (error: any) {
    console.error('Error fetching personnel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personnel', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePersonnelData = await request.json();
    
    if (!body.firstName || !body.lastName || !body.position || !body.type || !body.baseSalary || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('personnel')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformPersonnel(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating personnel:', error);
    return NextResponse.json(
      { error: 'Failed to create personnel', details: error.message },
      { status: 500 }
    );
  }
}

