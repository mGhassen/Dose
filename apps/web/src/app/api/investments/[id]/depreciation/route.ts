// Investment Depreciation API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { calculateDepreciation } from '@/lib/calculations/depreciation';
import type { Investment, DepreciationEntry } from '@kit/types';

function transformInvestment(row: any): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    purchaseDate: row.purchase_date,
    usefulLifeMonths: row.useful_life_months,
    depreciationMethod: row.depreciation_method,
    residualValue: parseFloat(row.residual_value),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformDepreciationEntry(row: any): DepreciationEntry {
  return {
    id: row.id,
    investmentId: row.investment_id,
    month: row.month,
    depreciationAmount: parseFloat(row.depreciation_amount),
    accumulatedDepreciation: parseFloat(row.accumulated_depreciation),
    bookValue: parseFloat(row.book_value),
  };
}

function transformToSnakeCase(entry: DepreciationEntry): any {
  return {
    investment_id: entry.investmentId,
    month: entry.month,
    depreciation_amount: entry.depreciationAmount,
    accumulated_depreciation: entry.accumulatedDepreciation,
    book_value: entry.bookValue,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('depreciation_entries')
      .select('*')
      .eq('investment_id', id)
      .order('month', { ascending: true });

    if (error) throw error;

    const entries: DepreciationEntry[] = (data || []).map(transformDepreciationEntry);

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching depreciation entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch depreciation entries', details: error.message },
      { status: 500 }
    );
  }
}

