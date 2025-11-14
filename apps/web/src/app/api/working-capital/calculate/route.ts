// Calculate Working Capital API Route
// Auto-calculates BFR from other data

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { calculateWorkingCapital } from '@/lib/calculations/financial-statements';
import type { WorkingCapital, Sale } from '@kit/types';

function transformSale(row: any): Sale {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: parseFloat(row.amount),
    quantity: row.quantity,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    if (!month) {
      return NextResponse.json({ error: 'Month parameter required (YYYY-MM)' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    
    // Get date range for the month
    const startDate = `${month}-01`;
    const endDateObj = new Date(`${month}-01`);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    endDateObj.setDate(0);
    const endDate = endDateObj.toISOString().split('T')[0];

    // Fetch sales for accounts receivable calculation
    // For simplicity, we'll use a percentage of monthly sales as receivables
    // In a real scenario, you'd track actual receivables
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (salesError) throw salesError;

    const sales: Sale[] = (salesData || []).map(transformSale);
    const monthlyRevenue = sales.reduce((sum, s) => sum + s.amount, 0);

    // Estimate accounts receivable (e.g., 30 days of sales = 1 month)
    // This is a simplified calculation - adjust based on your business logic
    const accountsReceivable = monthlyRevenue; // Assuming 30-day payment terms

    // For inventory and accounts payable, you might need manual entry or other calculations
    // For now, we'll use default values or fetch from existing working capital entry
    const { data: existingData } = await supabase
      .from('working_capital')
      .select('*')
      .eq('month', month)
      .single();

    const inventory = existingData ? parseFloat(existingData.inventory) : 0;
    const accountsPayable = existingData ? parseFloat(existingData.accounts_payable) : 0;
    const otherCurrentAssets = existingData ? parseFloat(existingData.other_current_assets) : 0;
    const otherCurrentLiabilities = existingData ? parseFloat(existingData.other_current_liabilities) : 0;

    // Calculate working capital
    const workingCapital = calculateWorkingCapital(
      month,
      accountsReceivable,
      inventory,
      accountsPayable,
      otherCurrentAssets,
      otherCurrentLiabilities
    );

    // Save to database (upsert)
    const { data: saved, error: saveError } = await supabase
      .from('working_capital')
      .upsert({
        month: workingCapital.month,
        accounts_receivable: workingCapital.accountsReceivable,
        inventory: workingCapital.inventory,
        accounts_payable: workingCapital.accountsPayable,
        other_current_assets: workingCapital.otherCurrentAssets,
        other_current_liabilities: workingCapital.otherCurrentLiabilities,
        working_capital_need: workingCapital.workingCapitalNeed,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'month',
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({
      id: saved.id,
      month: saved.month,
      accountsReceivable: parseFloat(saved.accounts_receivable),
      inventory: parseFloat(saved.inventory),
      accountsPayable: parseFloat(saved.accounts_payable),
      otherCurrentAssets: parseFloat(saved.other_current_assets),
      otherCurrentLiabilities: parseFloat(saved.other_current_liabilities),
      workingCapitalNeed: parseFloat(saved.working_capital_need),
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    });
  } catch (error: any) {
    console.error('Error calculating working capital:', error);
    return NextResponse.json(
      { error: 'Failed to calculate working capital', details: error.message },
      { status: 500 }
    );
  }
}

