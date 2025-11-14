// Dashboard Cash Flow Chart API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('cash_flow')
      .select('month, cash_inflows, cash_outflows')
      .gte('month', `${year}-01`)
      .lte('month', `${year}-12`)
      .order('month', { ascending: true });

    if (error) throw error;

    // Create map of all months
    const monthlyData: Record<string, { inflows: number; outflows: number }> = {};
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    months.forEach(month => {
      monthlyData[month] = { inflows: 0, outflows: 0 };
    });

    // Fill in actual data
    (data || []).forEach((cf: any) => {
      const month = cf.month.slice(5, 7); // Extract MM from YYYY-MM
      monthlyData[month] = {
        inflows: parseFloat(cf.cash_inflows || '0'),
        outflows: parseFloat(cf.cash_outflows || '0'),
      };
    });

    // Format for chart
    const chartData = months.map(month => ({
      month: `${year}-${month}`,
      inflows: monthlyData[month].inflows,
      outflows: monthlyData[month].outflows,
    }));

    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error('Error fetching cash flow chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow chart data', details: error.message },
      { status: 500 }
    );
  }
}

