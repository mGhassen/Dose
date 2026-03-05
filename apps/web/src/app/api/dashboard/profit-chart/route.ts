// Dashboard Profit Chart API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
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

    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from('profit_and_loss')
      .select('month, net_profit')
      .gte('month', firstMonth)
      .lte('month', lastMonth)
      .order('month', { ascending: true });

    if (error) throw error;

    const monthlyData: Record<string, number> = {};
    monthsInRange.forEach(m => { monthlyData[m] = 0; });

    (data || []).forEach((pl: any) => {
      if (monthlyData[pl.month] !== undefined) {
        monthlyData[pl.month] = parseFloat(pl.net_profit || '0');
      }
    });

    const chartData = monthsInRange.map(month => ({
      month,
      profit: monthlyData[month] || 0,
    }));

    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error('Error fetching profit chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profit chart data', details: error.message },
      { status: 500 }
    );
  }
}

