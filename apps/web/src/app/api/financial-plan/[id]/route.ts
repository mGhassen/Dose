// Financial Plan by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { FinancialPlan, UpdateFinancialPlanData } from '@kit/types';

function transformFinancialPlan(row: any): FinancialPlan {
  return {
    id: row.id,
    month: row.month,
    equity: parseFloat(row.equity),
    loans: parseFloat(row.loans),
    otherSources: parseFloat(row.other_sources),
    totalSources: parseFloat(row.total_sources),
    investments: parseFloat(row.investments),
    workingCapital: parseFloat(row.working_capital),
    loanRepayments: parseFloat(row.loan_repayments),
    otherUses: parseFloat(row.other_uses),
    totalUses: parseFloat(row.total_uses),
    netFinancing: parseFloat(row.net_financing),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateFinancialPlanData, currentData?: any): any {
  const result: any = {};
  
  const equity = data.equity !== undefined ? data.equity : parseFloat(currentData?.equity || '0');
  const loans = data.loans !== undefined ? data.loans : parseFloat(currentData?.loans || '0');
  const otherSources = data.otherSources !== undefined ? data.otherSources : parseFloat(currentData?.other_sources || '0');
  const investments = data.investments !== undefined ? data.investments : parseFloat(currentData?.investments || '0');
  const workingCapital = data.workingCapital !== undefined ? data.workingCapital : parseFloat(currentData?.working_capital || '0');
  const loanRepayments = data.loanRepayments !== undefined ? data.loanRepayments : parseFloat(currentData?.loan_repayments || '0');
  const otherUses = data.otherUses !== undefined ? data.otherUses : parseFloat(currentData?.other_uses || '0');

  if (data.month !== undefined) result.month = data.month;
  if (data.equity !== undefined) result.equity = data.equity;
  if (data.loans !== undefined) result.loans = data.loans;
  if (data.otherSources !== undefined) result.other_sources = data.otherSources;
  if (data.investments !== undefined) result.investments = data.investments;
  if (data.workingCapital !== undefined) result.working_capital = data.workingCapital;
  if (data.loanRepayments !== undefined) result.loan_repayments = data.loanRepayments;
  if (data.otherUses !== undefined) result.other_uses = data.otherUses;

  // Recalculate totals
  result.total_sources = equity + loans + otherSources;
  result.total_uses = investments + workingCapital + loanRepayments + otherUses;
  result.net_financing = result.total_sources - result.total_uses;
  
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
      .from('financial_plan')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Financial plan not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformFinancialPlan(data));
  } catch (error: any) {
    console.error('Error fetching financial plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial plan', details: error.message },
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
    const body: UpdateFinancialPlanData = await request.json();

    const supabase = createServerSupabaseClient();
    
    const { data: currentData } = await supabase
      .from('financial_plan')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('financial_plan')
      .update(transformToSnakeCase(body, currentData))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Financial plan not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformFinancialPlan(data));
  } catch (error: any) {
    console.error('Error updating financial plan:', error);
    return NextResponse.json(
      { error: 'Failed to update financial plan', details: error.message },
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
      .from('financial_plan')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting financial plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete financial plan', details: error.message },
      { status: 500 }
    );
  }
}

