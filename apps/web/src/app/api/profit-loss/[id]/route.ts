// Profit and Loss by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { ProfitAndLoss, UpdateProfitAndLossData } from '@kit/types';

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

function transformToSnakeCase(data: UpdateProfitAndLossData, currentData?: any): any {
  const result: any = {};
  
  // Get current values or use provided
  const totalRevenue = data.totalRevenue !== undefined ? data.totalRevenue : parseFloat(currentData?.total_revenue || '0');
  const costOfGoodsSold = data.costOfGoodsSold !== undefined ? data.costOfGoodsSold : parseFloat(currentData?.cost_of_goods_sold || '0');
  const operatingExpenses = data.operatingExpenses !== undefined ? data.operatingExpenses : parseFloat(currentData?.operating_expenses || '0');
  const personnelCosts = data.personnelCosts !== undefined ? data.personnelCosts : parseFloat(currentData?.personnel_costs || '0');
  const leasingCosts = data.leasingCosts !== undefined ? data.leasingCosts : parseFloat(currentData?.leasing_costs || '0');
  const depreciation = data.depreciation !== undefined ? data.depreciation : parseFloat(currentData?.depreciation || '0');
  const interestExpense = data.interestExpense !== undefined ? data.interestExpense : parseFloat(currentData?.interest_expense || '0');
  const taxes = data.taxes !== undefined ? data.taxes : parseFloat(currentData?.taxes || '0');
  const otherExpenses = data.otherExpenses !== undefined ? data.otherExpenses : parseFloat(currentData?.other_expenses || '0');

  if (data.month !== undefined) result.month = data.month;
  if (data.totalRevenue !== undefined) result.total_revenue = data.totalRevenue;
  if (data.costOfGoodsSold !== undefined) result.cost_of_goods_sold = data.costOfGoodsSold;
  if (data.operatingExpenses !== undefined) result.operating_expenses = data.operatingExpenses;
  if (data.personnelCosts !== undefined) result.personnel_costs = data.personnelCosts;
  if (data.leasingCosts !== undefined) result.leasing_costs = data.leasingCosts;
  if (data.depreciation !== undefined) result.depreciation = data.depreciation;
  if (data.interestExpense !== undefined) result.interest_expense = data.interestExpense;
  if (data.taxes !== undefined) result.taxes = data.taxes;
  if (data.otherExpenses !== undefined) result.other_expenses = data.otherExpenses;

  // Recalculate derived values
  result.gross_profit = totalRevenue - costOfGoodsSold;
  result.operating_profit = result.gross_profit - operatingExpenses - personnelCosts - leasingCosts - depreciation;
  result.net_profit = result.operating_profit - interestExpense - taxes - otherExpenses;
  
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
      .from('profit_and_loss')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Profit and Loss entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformProfitAndLoss(data));
  } catch (error: any) {
    console.error('Error fetching profit and loss:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profit and loss', details: error.message },
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
    const body: UpdateProfitAndLossData = await request.json();

    const supabase = createServerSupabaseClient();
    
    // Get current data for calculations
    const { data: currentData } = await supabase
      .from('profit_and_loss')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('profit_and_loss')
      .update(transformToSnakeCase(body, currentData))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Profit and Loss entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformProfitAndLoss(data));
  } catch (error: any) {
    console.error('Error updating profit and loss:', error);
    return NextResponse.json(
      { error: 'Failed to update profit and loss', details: error.message },
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
      .from('profit_and_loss')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting profit and loss:', error);
    return NextResponse.json(
      { error: 'Failed to delete profit and loss', details: error.message },
      { status: 500 }
    );
  }
}

