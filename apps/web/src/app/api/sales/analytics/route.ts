// Sales Analytics API Route
// Provides data for charts and visualizations

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getMonthsInRange } from '@kit/lib/date-periods';
import type { Sale } from '@kit/types';

function transformSale(row: any): Sale {
  const subtotal = row.subtotal != null ? parseFloat(row.subtotal) : 0;
  const totalTax = row.total_tax != null ? parseFloat(row.total_tax) : 0;
  const totalDiscount = row.total_discount != null ? parseFloat(row.total_discount) : 0;
  const amount = Math.round((subtotal + totalTax - totalDiscount) * 100) / 100;
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

/** sales.date is TIMESTAMPTZ; group by UTC calendar day, not the raw ISO string (which is unique per sale). */
function utcCalendarDay(dateIso: string): string {
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) {
    return dateIso.length >= 10 ? dateIso.slice(0, 10) : dateIso;
  }
  return new Date(t).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      const year = yearParam || new Date().getFullYear().toString();
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const supabase = supabaseServer();

    let allSales: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
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

    const sales = allSales.map(transformSale);

    const typeBreakdown: Record<string, number> = {};
    sales.forEach(sale => {
      typeBreakdown[sale.type] = (typeBreakdown[sale.type] || 0) + sale.amount;
    });

    const monthKeys = getMonthsInRange(startDate, endDate);
    const monthlyData: Record<string, { total: number; count: number; byType: Record<string, number> }> = {};
    monthKeys.forEach(key => {
      monthlyData[key] = { total: 0, count: 0, byType: {} };
    });

    sales.forEach(sale => {
      const key = sale.date.slice(0, 7);
      if (monthlyData[key]) {
        monthlyData[key].total += sale.amount;
        monthlyData[key].count += 1;
        monthlyData[key].byType[sale.type] = (monthlyData[key].byType[sale.type] || 0) + sale.amount;
      }
    });

    const monthlyChartData = monthKeys.map(key => ({
      month: key,
      revenue: monthlyData[key].total,
      count: monthlyData[key].count,
      average: monthlyData[key].count > 0 ? monthlyData[key].total / monthlyData[key].count : 0,
      ...monthlyData[key].byType,
    }));

    const dailyData: Record<string, number> = {};
    sales.forEach(sale => {
      const dayKey = utcCalendarDay(sale.date);
      dailyData[dayKey] = (dailyData[dayKey] || 0) + sale.amount;
    });

    const dailyChartData = Object.entries(dailyData)
      .map(([day, revenue]) => ({ day, revenue }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const averageOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;

    const bestDays = Object.entries(dailyData)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const periodDays = daysBetween(startDate, endDate);

    return NextResponse.json({
      typeBreakdown: Object.entries(typeBreakdown).map(([type, amount]) => ({
        type,
        amount,
        percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
      })),
      monthlyTrend: monthlyChartData,
      dailyTrend: dailyChartData,
      bestDays,
      summary: {
        totalRevenue,
        totalSales: sales.length,
        averageOrderValue,
        averageDailyRevenue: totalRevenue / periodDays,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales analytics', details: error.message },
      { status: 500 }
    );
  }
}
