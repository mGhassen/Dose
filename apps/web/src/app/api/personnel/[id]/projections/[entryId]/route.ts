// Update/Delete Personnel Salary Projection Entry API Route

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const body = await request.json();
    
    const supabase = createServerSupabaseClient();
    
    // Verify the entry belongs to this personnel
    const { data: existing, error: fetchError } = await supabase
      .from('personnel_salary_projections')
      .select('*')
      .eq('id', entryId)
      .eq('personnel_id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Projection entry not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.bruteSalary !== undefined) updateData.brute_salary = body.bruteSalary;
    if (body.netSalary !== undefined) updateData.net_salary = body.netSalary;
    if (body.socialTaxes !== undefined) updateData.social_taxes = body.socialTaxes;
    if (body.employerTaxes !== undefined) updateData.employer_taxes = body.employerTaxes;
    if (body.netPaymentDate !== undefined) updateData.net_payment_date = body.netPaymentDate;
    if (body.taxesPaymentDate !== undefined) updateData.taxes_payment_date = body.taxesPaymentDate;
    if (body.isProjected !== undefined) updateData.is_projected = body.isProjected;
    if (body.isNetPaid !== undefined) updateData.is_net_paid = body.isNetPaid;
    if (body.isTaxesPaid !== undefined) updateData.is_taxes_paid = body.isTaxesPaid;
    if (body.netPaidDate !== undefined) updateData.net_paid_date = body.netPaidDate;
    if (body.taxesPaidDate !== undefined) updateData.taxes_paid_date = body.taxesPaidDate;
    if (body.actualNetAmount !== undefined) updateData.actual_net_amount = body.actualNetAmount;
    if (body.actualTaxesAmount !== undefined) updateData.actual_taxes_amount = body.actualTaxesAmount;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data, error } = await supabase
      .from('personnel_salary_projections')
      .update(updateData)
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformProjectionEntry(data));
  } catch (error: any) {
    console.error('Error updating personnel salary projection:', error);
    return NextResponse.json(
      { error: 'Failed to update personnel salary projection', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    
    const supabase = createServerSupabaseClient();
    
    // Verify the entry belongs to this personnel
    const { data: existing, error: fetchError } = await supabase
      .from('personnel_salary_projections')
      .select('*')
      .eq('id', entryId)
      .eq('personnel_id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Projection entry not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('personnel_salary_projections')
      .delete()
      .eq('id', entryId);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting personnel salary projection:', error);
    return NextResponse.json(
      { error: 'Failed to delete personnel salary projection', details: error.message },
      { status: 500 }
    );
  }
}

