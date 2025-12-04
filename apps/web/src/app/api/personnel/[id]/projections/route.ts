// Get Personnel Salary Projection Entries API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

function transformProjectionEntry(row: any) {
  return {
    id: row.id,
    personnelId: row.personnel_id,
    month: row.month,
    bruteSalary: parseFloat(row.brute_salary),
    netSalary: parseFloat(row.net_salary),
    socialTaxes: parseFloat(row.social_taxes || 0),
    employerTaxes: parseFloat(row.employer_taxes || 0),
    netPaymentDate: row.net_payment_date,
    taxesPaymentDate: row.taxes_payment_date,
    isProjected: row.is_projected,
    isNetPaid: row.is_net_paid,
    isTaxesPaid: row.is_taxes_paid,
    netPaidDate: row.net_paid_date,
    taxesPaidDate: row.taxes_paid_date,
    actualNetAmount: row.actual_net_amount ? parseFloat(row.actual_net_amount) : null,
    actualTaxesAmount: row.actual_taxes_amount ? parseFloat(row.actual_taxes_amount) : null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');
    
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('personnel_salary_projections')
      .select('*')
      .eq('personnel_id', id)
      .order('month', { ascending: true });

    if (startMonth) {
      query = query.gte('month', startMonth);
    }
    if (endMonth) {
      query = query.lte('month', endMonth);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching personnel salary projections:', error);
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('personnel_salary_projections table does not exist yet, returning empty array');
        return NextResponse.json([]);
      }
      throw error;
    }

    const entries = (data || []).map(transformProjectionEntry);

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching personnel salary projections:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: 'Failed to fetch personnel salary projections', details: error.message },
      { status: 500 }
    );
  }
}

// Create or update a projection entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.month || body.bruteSalary === undefined || body.netSalary === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: month, bruteSalary, netSalary' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Check if entry already exists
    const { data: existing } = await supabase
      .from('personnel_salary_projections')
      .select('*')
      .eq('personnel_id', id)
      .eq('month', body.month)
      .maybeSingle();

    let projectionEntry;
    
    if (existing) {
      // Update existing entry
      const { data, error } = await supabase
        .from('personnel_salary_projections')
        .update({
          brute_salary: body.bruteSalary,
          net_salary: body.netSalary,
          social_taxes: body.socialTaxes ?? existing.social_taxes ?? 0,
          employer_taxes: body.employerTaxes ?? existing.employer_taxes ?? 0,
          net_payment_date: body.netPaymentDate ?? existing.net_payment_date,
          taxes_payment_date: body.taxesPaymentDate ?? existing.taxes_payment_date,
          is_projected: body.isProjected !== undefined ? body.isProjected : existing.is_projected,
          is_net_paid: body.isNetPaid !== undefined ? body.isNetPaid : existing.is_net_paid,
          is_taxes_paid: body.isTaxesPaid !== undefined ? body.isTaxesPaid : existing.is_taxes_paid,
          net_paid_date: body.netPaidDate ?? existing.net_paid_date,
          taxes_paid_date: body.taxesPaidDate ?? existing.taxes_paid_date,
          actual_net_amount: body.actualNetAmount ?? existing.actual_net_amount,
          actual_taxes_amount: body.actualTaxesAmount ?? existing.actual_taxes_amount,
          notes: body.notes ?? existing.notes,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      projectionEntry = data;
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('personnel_salary_projections')
        .insert({
          personnel_id: id,
          month: body.month,
          brute_salary: body.bruteSalary,
          net_salary: body.netSalary,
          social_taxes: body.socialTaxes ?? 0,
          employer_taxes: body.employerTaxes ?? 0,
          net_payment_date: body.netPaymentDate,
          taxes_payment_date: body.taxesPaymentDate,
          is_projected: body.isProjected !== undefined ? body.isProjected : true,
          is_net_paid: body.isNetPaid ?? false,
          is_taxes_paid: body.isTaxesPaid ?? false,
          net_paid_date: body.netPaidDate,
          taxes_paid_date: body.taxesPaidDate,
          actual_net_amount: body.actualNetAmount,
          actual_taxes_amount: body.actualTaxesAmount,
          notes: body.notes,
        })
        .select()
        .single();

      if (error) throw error;
      projectionEntry = data;
    }

    return NextResponse.json(transformProjectionEntry(projectionEntry));
  } catch (error: any) {
    console.error('Error creating/updating personnel salary projection:', error);
    return NextResponse.json(
      { error: 'Failed to create/update personnel salary projection', details: error.message },
      { status: 500 }
    );
  }
}

