// Working Capital API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { WorkingCapital, CreateWorkingCapitalData } from '@kit/types';

function transformWorkingCapital(row: any): WorkingCapital {
  return {
    id: row.id,
    month: row.month,
    accountsReceivable: parseFloat(row.accounts_receivable),
    inventory: parseFloat(row.inventory),
    accountsPayable: parseFloat(row.accounts_payable),
    otherCurrentAssets: parseFloat(row.other_current_assets),
    otherCurrentLiabilities: parseFloat(row.other_current_liabilities),
    workingCapitalNeed: parseFloat(row.working_capital_need),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateWorkingCapitalData): any {
  const currentAssets = data.accountsReceivable + data.inventory + (data.otherCurrentAssets || 0);
  const currentLiabilities = data.accountsPayable + (data.otherCurrentLiabilities || 0);
  const workingCapitalNeed = currentAssets - currentLiabilities;

  return {
    month: data.month,
    accounts_receivable: data.accountsReceivable,
    inventory: data.inventory,
    accounts_payable: data.accountsPayable,
    other_current_assets: data.otherCurrentAssets || 0,
    other_current_liabilities: data.otherCurrentLiabilities || 0,
    working_capital_need: workingCapitalNeed,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('working_capital')
      .select('*')
      .order('month', { ascending: false });

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) throw error;

    const workingCapital: WorkingCapital[] = (data || []).map(transformWorkingCapital);
    
    return NextResponse.json(workingCapital);
  } catch (error: any) {
    console.error('Error fetching working capital:', error);
    return NextResponse.json(
      { error: 'Failed to fetch working capital', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateWorkingCapitalData = await request.json();
    
    if (!body.month || body.accountsReceivable === undefined || body.inventory === undefined || body.accountsPayable === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: month, accountsReceivable, inventory, accountsPayable' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('working_capital')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformWorkingCapital(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating working capital:', error);
    return NextResponse.json(
      { error: 'Failed to create working capital', details: error.message },
      { status: 500 }
    );
  }
}

