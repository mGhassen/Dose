// Profit and Loss API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { ProfitAndLoss, CreateProfitAndLossData } from '@kit/types';

function transformProfitAndLoss(row: any): ProfitAndLoss {
  return {
    id: row.id,
    month: row.month,
    totalRevenue: parseFloat(row.total_revenue),
    costOfGoodsSold: parseFloat(row.cost_of_goods_sold),
    operatingExpenses: parseFloat(row.operating_expenses),
    personnelCosts: parseFloat(row.personnel_costs),
    leasingCosts: parseFloat(row.leasing_costs),
    depreciation: parseFloat(row.depreciation),
    interestExpense: parseFloat(row.interest_expense),
    taxes: parseFloat(row.taxes),
    otherExpenses: parseFloat(row.other_expenses),
    grossProfit: parseFloat(row.gross_profit),
    operatingProfit: parseFloat(row.operating_profit),
    netProfit: parseFloat(row.net_profit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateProfitAndLossData): any {
  // Calculate derived values
  const costOfGoodsSold = data.costOfGoodsSold || 0;
  const operatingExpenses = data.operatingExpenses || 0;
  const personnelCosts = data.personnelCosts || 0;
  const leasingCosts = data.leasingCosts || 0;
  const depreciation = data.depreciation || 0;
  const interestExpense = data.interestExpense || 0;
  const taxes = data.taxes || 0;
  const otherExpenses = data.otherExpenses || 0;

  const grossProfit = data.totalRevenue - costOfGoodsSold;
  const operatingProfit = grossProfit - operatingExpenses - personnelCosts - leasingCosts - depreciation;
  const netProfit = operatingProfit - interestExpense - taxes - otherExpenses;

  return {
    month: data.month,
    total_revenue: data.totalRevenue,
    cost_of_goods_sold: costOfGoodsSold,
    operating_expenses: operatingExpenses,
    personnel_costs: personnelCosts,
    leasing_costs: leasingCosts,
    depreciation: depreciation,
    interest_expense: interestExpense,
    taxes: taxes,
    other_expenses: otherExpenses,
    gross_profit: grossProfit,
    operating_profit: operatingProfit,
    net_profit: netProfit,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('profit_and_loss')
      .select('*')
      .order('month', { ascending: false });

    if (month) {
      query = query.eq('month', month).limit(1);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (month) {
      // Return single item for month query
      if (!data || data.length === 0) {
        return NextResponse.json(null);
      }
      return NextResponse.json(transformProfitAndLoss(data[0]));
    }

    const profitLoss: ProfitAndLoss[] = (data || []).map(transformProfitAndLoss);
    
    return NextResponse.json(profitLoss);
  } catch (error: any) {
    console.error('Error fetching profit and loss:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profit and loss', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProfitAndLossData = await request.json();
    
    if (!body.month || body.totalRevenue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: month, totalRevenue' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('profit_and_loss')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformProfitAndLoss(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating profit and loss:', error);
    return NextResponse.json(
      { error: 'Failed to create profit and loss', details: error.message },
      { status: 500 }
    );
  }
}

