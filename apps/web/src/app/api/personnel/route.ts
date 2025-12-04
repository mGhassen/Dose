// Personnel API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Personnel, CreatePersonnelData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformPersonnel(row: any): Personnel {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    position: row.position,
    type: row.type,
    baseSalary: parseFloat(row.base_salary),
    salaryFrequency: row.salary_frequency || 'monthly',
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

// Convert salary to monthly based on frequency
function convertToMonthlySalary(salary: number, frequency: 'yearly' | 'monthly' | 'weekly'): number {
  switch (frequency) {
    case 'yearly':
      return salary / 12;
    case 'monthly':
      return salary;
    case 'weekly':
      return salary * 52 / 12; // 52 weeks per year / 12 months
    default:
      return salary;
  }
}

function transformToSnakeCase(data: CreatePersonnelData): any {
  // Convert salary to monthly before storing
  const monthlySalary = convertToMonthlySalary(data.baseSalary, data.salaryFrequency);
  
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    position: data.position,
    type: data.type,
    base_salary: monthlySalary, // Store as monthly
    salary_frequency: data.salaryFrequency,
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
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Count query
    const countQuery = supabase
      .from('personnel')
      .select('*', { count: 'exact', head: true });

    // Data query
    const query = supabase
      .from('personnel')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const personnel: Personnel[] = (data || []).map(transformPersonnel);
    const total = count || 0;
    
    const response: PaginatedResponse<Personnel> = createPaginatedResponse(
      personnel,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
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

