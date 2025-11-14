// Balance Sheet API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { BalanceSheet, CreateBalanceSheetData } from '@kit/types';

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

function transformToSnakeCase(data: CreateBalanceSheetData): any {
  const intangibleAssets = data.intangibleAssets || 0;
  const retainedEarnings = data.retainedEarnings || 0;

  const totalAssets = data.currentAssets + data.fixedAssets + intangibleAssets;
  const totalLiabilities = data.currentLiabilities + data.longTermDebt;
  const totalEquity = data.shareCapital + retainedEarnings;

  return {
    month: data.month,
    current_assets: data.currentAssets,
    fixed_assets: data.fixedAssets,
    intangible_assets: intangibleAssets,
    total_assets: totalAssets,
    current_liabilities: data.currentLiabilities,
    long_term_debt: data.longTermDebt,
    total_liabilities: totalLiabilities,
    share_capital: data.shareCapital,
    retained_earnings: retainedEarnings,
    total_equity: totalEquity,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('balance_sheet')
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
      return NextResponse.json(transformBalanceSheet(data[0]));
    }

    const balanceSheets: BalanceSheet[] = (data || []).map(transformBalanceSheet);
    
    return NextResponse.json(balanceSheets);
  } catch (error: any) {
    console.error('Error fetching balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance sheet', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBalanceSheetData = await request.json();
    
    if (!body.month || body.currentAssets === undefined || body.fixedAssets === undefined || 
        body.currentLiabilities === undefined || body.longTermDebt === undefined || body.shareCapital === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('balance_sheet')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformBalanceSheet(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to create balance sheet', details: error.message },
      { status: 500 }
    );
  }
}

