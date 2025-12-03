// Balance Sheet by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { BalanceSheet, UpdateBalanceSheetData } from '@kit/types';

function transformBalanceSheet(row: any): BalanceSheet {
  return {
    id: row.id,
    month: row.month,
    currentAssets: parseFloat(row.current_assets),
    fixedAssets: parseFloat(row.fixed_assets),
    intangibleAssets: parseFloat(row.intangible_assets),
    totalAssets: parseFloat(row.total_assets),
    currentLiabilities: parseFloat(row.current_liabilities),
    longTermDebt: parseFloat(row.long_term_debt),
    totalLiabilities: parseFloat(row.total_liabilities),
    shareCapital: parseFloat(row.share_capital),
    retainedEarnings: parseFloat(row.retained_earnings),
    totalEquity: parseFloat(row.total_equity),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateBalanceSheetData, currentData?: any): any {
  const result: any = {};
  
  const currentAssets = data.currentAssets !== undefined ? data.currentAssets : parseFloat(currentData?.current_assets || '0');
  const fixedAssets = data.fixedAssets !== undefined ? data.fixedAssets : parseFloat(currentData?.fixed_assets || '0');
  const intangibleAssets = data.intangibleAssets !== undefined ? data.intangibleAssets : parseFloat(currentData?.intangible_assets || '0');
  const currentLiabilities = data.currentLiabilities !== undefined ? data.currentLiabilities : parseFloat(currentData?.current_liabilities || '0');
  const longTermDebt = data.longTermDebt !== undefined ? data.longTermDebt : parseFloat(currentData?.long_term_debt || '0');
  const shareCapital = data.shareCapital !== undefined ? data.shareCapital : parseFloat(currentData?.share_capital || '0');
  const retainedEarnings = data.retainedEarnings !== undefined ? data.retainedEarnings : parseFloat(currentData?.retained_earnings || '0');

  if (data.month !== undefined) result.month = data.month;
  if (data.currentAssets !== undefined) result.current_assets = data.currentAssets;
  if (data.fixedAssets !== undefined) result.fixed_assets = data.fixedAssets;
  if (data.intangibleAssets !== undefined) result.intangible_assets = data.intangibleAssets;
  if (data.currentLiabilities !== undefined) result.current_liabilities = data.currentLiabilities;
  if (data.longTermDebt !== undefined) result.long_term_debt = data.longTermDebt;
  if (data.shareCapital !== undefined) result.share_capital = data.shareCapital;
  if (data.retainedEarnings !== undefined) result.retained_earnings = data.retainedEarnings;

  // Recalculate totals
  result.total_assets = currentAssets + fixedAssets + intangibleAssets;
  result.total_liabilities = currentLiabilities + longTermDebt;
  result.total_equity = shareCapital + retainedEarnings;
  
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
      .from('balance_sheet')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Balance sheet not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformBalanceSheet(data));
  } catch (error: any) {
    console.error('Error fetching balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance sheet', details: error.message },
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
    const body: UpdateBalanceSheetData = await request.json();

    const supabase = createServerSupabaseClient();
    
    const { data: currentData } = await supabase
      .from('balance_sheet')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('balance_sheet')
      .update(transformToSnakeCase(body, currentData))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Balance sheet not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformBalanceSheet(data));
  } catch (error: any) {
    console.error('Error updating balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to update balance sheet', details: error.message },
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
      .from('balance_sheet')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to delete balance sheet', details: error.message },
      { status: 500 }
    );
  }
}

