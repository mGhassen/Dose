// Financial Plan API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { FinancialPlan, CreateFinancialPlanData } from '@kit/types';

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

function transformToSnakeCase(data: CreateFinancialPlanData): any {
  const equity = data.equity || 0;
  const loans = data.loans || 0;
  const otherSources = data.otherSources || 0;
  const investments = data.investments || 0;
  const workingCapital = data.workingCapital || 0;
  const loanRepayments = data.loanRepayments || 0;
  const otherUses = data.otherUses || 0;

  const totalSources = equity + loans + otherSources;
  const totalUses = investments + workingCapital + loanRepayments + otherUses;
  const netFinancing = totalSources - totalUses;

  return {
    month: data.month,
    equity: equity,
    loans: loans,
    other_sources: otherSources,
    total_sources: totalSources,
    investments: investments,
    working_capital: workingCapital,
    loan_repayments: loanRepayments,
    other_uses: otherUses,
    total_uses: totalUses,
    net_financing: netFinancing,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('financial_plan')
      .select('*')
      .order('month', { ascending: false });

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) throw error;

    const financialPlans: FinancialPlan[] = (data || []).map(transformFinancialPlan);
    
    return NextResponse.json(financialPlans);
  } catch (error: any) {
    console.error('Error fetching financial plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial plan', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateFinancialPlanData = await request.json();
    
    if (!body.month) {
      return NextResponse.json(
        { error: 'Missing required field: month' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('financial_plan')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformFinancialPlan(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating financial plan:', error);
    return NextResponse.json(
      { error: 'Failed to create financial plan', details: error.message },
      { status: 500 }
    );
  }
}

