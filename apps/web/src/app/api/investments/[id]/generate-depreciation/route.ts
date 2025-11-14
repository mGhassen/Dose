// Generate Investment Depreciation API Route

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

function transformToSnakeCase(entry: DepreciationEntry): any {
  return {
    investment_id: entry.investmentId,
    month: entry.month,
    depreciation_amount: entry.depreciationAmount,
    accumulated_depreciation: entry.accumulatedDepreciation,
    book_value: entry.bookValue,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    // Fetch investment
    const { data: investmentData, error: investmentError } = await supabase
      .from('investments')
      .select('*')
      .eq('id', id)
      .single();

    if (investmentError) {
      if (investmentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
      }
      throw investmentError;
    }

    const investment = transformInvestment(investmentData);

    // Calculate depreciation starting from purchase date
    const startMonth = investment.purchaseDate.slice(0, 7); // YYYY-MM
    const schedule = calculateDepreciation(investment, startMonth);

    // Delete existing depreciation entries
    await supabase
      .from('depreciation_entries')
      .delete()
      .eq('investment_id', id);

    // Insert new depreciation entries
    const scheduleData = schedule.map(transformToSnakeCase);
    const { data: insertedSchedule, error: insertError } = await supabase
      .from('depreciation_entries')
      .insert(scheduleData)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json(insertedSchedule, { status: 201 });
  } catch (error: any) {
    console.error('Error generating depreciation:', error);
    return NextResponse.json(
      { error: 'Failed to generate depreciation', details: error.message },
      { status: 500 }
    );
  }
}

