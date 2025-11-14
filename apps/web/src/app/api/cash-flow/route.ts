// Cash Flow API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { CashFlowEntry, CreateCashFlowEntryData } from '@kit/types';

function transformCashFlow(row: any): CashFlowEntry {
  return {
    id: row.id,
    month: row.month,
    openingBalance: parseFloat(row.opening_balance),
    cashInflows: parseFloat(row.cash_inflows),
    cashOutflows: parseFloat(row.cash_outflows),
    netCashFlow: parseFloat(row.net_cash_flow),
    closingBalance: parseFloat(row.closing_balance),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateCashFlowEntryData): any {
  const netCashFlow = data.cashInflows - data.cashOutflows;
  const closingBalance = data.openingBalance + netCashFlow;
  
  return {
    month: data.month,
    opening_balance: data.openingBalance,
    cash_inflows: data.cashInflows,
    cash_outflows: data.cashOutflows,
    net_cash_flow: netCashFlow,
    closing_balance: closingBalance,
    notes: data.notes,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('cash_flow')
      .select('*')
      .order('month', { ascending: false });

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) throw error;

    const cashFlow: CashFlowEntry[] = (data || []).map(transformCashFlow);
    
    return NextResponse.json(cashFlow);
  } catch (error: any) {
    console.error('Error fetching cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateCashFlowEntryData = await request.json();
    
    if (!body.month || body.openingBalance === undefined || body.cashInflows === undefined || body.cashOutflows === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: month, openingBalance, cashInflows, cashOutflows' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('cash_flow')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformCashFlow(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating cash flow entry:', error);
    return NextResponse.json(
      { error: 'Failed to create cash flow entry', details: error.message },
      { status: 500 }
    );
  }
}

