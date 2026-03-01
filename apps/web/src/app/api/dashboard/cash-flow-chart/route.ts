// Dashboard Cash Flow Chart API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { getMonthsInRange } from '@kit/lib/date-periods';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const startDate = searchParams.get('startDate') || `${year}-01-01`;
    const endDate = searchParams.get('endDate') || `${year}-12-31`;

    const monthsInRange = getMonthsInRange(startDate, endDate);
    const firstMonth = monthsInRange[0] || `${year}-01`;
    const lastMonth = monthsInRange[monthsInRange.length - 1] || `${year}-12`;

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('cash_flow')
      .select('month, cash_inflows, cash_outflows')
      .gte('month', firstMonth)
      .lte('month', lastMonth)
      .order('month', { ascending: true });

    if (error) throw error;

    const monthlyData: Record<string, { inflows: number; outflows: number }> = {};
    monthsInRange.forEach(m => { monthlyData[m] = { inflows: 0, outflows: 0 }; });

    (data || []).forEach((cf: any) => {
      if (monthlyData[cf.month]) {
        monthlyData[cf.month] = {
          inflows: parseFloat(cf.cash_inflows || '0'),
          outflows: parseFloat(cf.cash_outflows || '0'),
        };
      }
    });

    let runningBalance = 0;
    const chartData = monthsInRange.map(month => {
      const inflows = monthlyData[month].inflows;
      const outflows = monthlyData[month].outflows;
      const cashFlow = inflows - outflows;
      runningBalance += cashFlow;
      return {
        month,
        inflows,
        outflows,
        cashFlow,
        balance: runningBalance,
      };
    });

    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error('Error fetching cash flow chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow chart data', details: error.message },
      { status: 500 }
    );
  }
}

