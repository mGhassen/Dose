// Generate and Store Expense Projections API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { projectExpense } from '@/lib/calculations/expense-projections';
import type { Expense } from '@kit/types';

function transformExpense(row: any): Expense {
  const base = {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    expenseDate: row.expense_date ?? row.start_date,
    description: row.description,
    vendor: row.vendor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return { ...base, startDate: row.start_date, endDate: row.end_date, isActive: row.is_active } as Expense;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth') || new Date().toISOString().slice(0, 7);
    const endMonth = searchParams.get('endMonth') || (() => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().slice(0, 7);
    })();
    
    const supabase = createServerSupabaseClient();
    
    // Fetch expense
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (expenseError) {
      if (expenseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      throw expenseError;
    }

    const expense = transformExpense(expenseData);

    // Calculate projections
    const projections = projectExpense(expense, startMonth, endMonth);

    // Delete existing projections for this expense
    await supabase
      .from('expense_projection_entries')
      .delete()
      .eq('expense_id', id);

    // Insert new projections
    const projectionData = projections.map(proj => ({
      expense_id: proj.expenseId,
      month: proj.month,
      amount: proj.amount,
      is_projected: proj.isProjected,
      is_paid: false,
      paid_date: null,
      actual_amount: null,
      notes: null,
    }));

    const { data: insertedProjections, error: insertError } = await supabase
      .from('expense_projection_entries')
      .insert(projectionData)
      .select();

    if (insertError) throw insertError;

    // Create OUTPUT entries for each projection entry
    if (insertedProjections && insertedProjections.length > 0) {
      const entryData = insertedProjections.map((proj: any) => ({
        direction: 'output',
        entry_type: 'expense_payment',
        name: `${expense.name} - ${proj.month}`,
        amount: proj.amount,
        description: `Expense payment for ${proj.month}`,
        category: expense.category,
        vendor: expense.vendor,
        entry_date: `${proj.month}-01`,
        due_date: `${proj.month}-01`,
        reference_id: parseInt(id),
        schedule_entry_id: proj.id,
        is_active: (expense as { isActive?: boolean }).isActive ?? true,
      }));

      const { error: entryError } = await supabase
        .from('entries')
        .insert(entryData);

      if (entryError) {
        console.error('Error creating entries for expense projections:', entryError);
        // Don't fail the projection creation if entry creation fails, but log it
      }
    }

    return NextResponse.json(insertedProjections, { status: 201 });
  } catch (error: any) {
    console.error('Error generating expense projections:', error);
    return NextResponse.json(
      { error: 'Failed to generate expense projections', details: error.message },
      { status: 500 }
    );
  }
}

