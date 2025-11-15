// Generate and Store Expense Projections API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { projectExpense } from '@/lib/calculations/expense-projections';
import type { Expense } from '@kit/types';

function transformExpense(row: any): Expense {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    recurrence: row.recurrence,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    vendor: row.vendor,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

    return NextResponse.json(insertedProjections, { status: 201 });
  } catch (error: any) {
    console.error('Error generating expense projections:', error);
    return NextResponse.json(
      { error: 'Failed to generate expense projections', details: error.message },
      { status: 500 }
    );
  }
}

