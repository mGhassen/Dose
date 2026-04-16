// Dashboard Revenue Chart API Route

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
    const firstMonth = monthsInRange[0];
    const lastMonth = monthsInRange[monthsInRange.length - 1];
    const supabase = supabaseServer();

    const { data: plRows } = await supabase
      .from('profit_and_loss')
      .select('month, total_revenue')
      .gte('month', firstMonth)
      .lte('month', lastMonth);

    const plByMonth: Record<string, number> = {};
    (plRows || []).forEach((row: any) => {
      plByMonth[row.month] = parseFloat(row.total_revenue || '0');
    });

    let allSales: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('sales')
        .select('date, subtotal, total_tax, total_discount')
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

    const usePL = plRows && plRows.length > 0;
    if (usePL) {
      monthsInRange.forEach(m => {
        monthlyData[m] = plByMonth[m] ?? 0;
      });
    } else {
      (allSales || []).forEach((sale: any) => {
        const month = sale.date?.slice(0, 7);
        if (month && monthlyData[month] !== undefined) {
          const sub = sale.subtotal != null ? parseFloat(sale.subtotal) : null;
          const tax = sale.total_tax != null ? parseFloat(sale.total_tax) : 0;
          const disc = sale.total_discount != null ? parseFloat(sale.total_discount) : 0;
          const headerTotal = Math.round(((sub ?? 0) + tax - disc) * 100) / 100;
          const amt = sub != null ? sub : headerTotal;
          monthlyData[month] += amt;
        }
      });
    }

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

