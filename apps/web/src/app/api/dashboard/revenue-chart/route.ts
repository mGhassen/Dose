// Dashboard Revenue Chart API Route

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
    const supabase = createServerSupabaseClient();

    let allSales: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('sales')
        .select('date, amount')
        .gte('date', startDate)
        .lte('date', endDate)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allSales = allSales.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    const monthlyData: Record<string, number> = {};
    monthsInRange.forEach(m => { monthlyData[m] = 0; });

    (allSales || []).forEach((sale: any) => {
      const month = sale.date.slice(0, 7);
      if (monthlyData[month] !== undefined) {
        monthlyData[month] += parseFloat(sale.amount);
      }
    });

    const chartData = monthsInRange.map(month => ({
      month,
      revenue: monthlyData[month] || 0,
    }));

    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error('Error fetching revenue chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue chart data', details: error.message },
      { status: 500 }
    );
  }
}

