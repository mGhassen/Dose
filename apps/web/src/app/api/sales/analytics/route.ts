// Sales Analytics API Route
// Provides data for charts and visualizations

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Sale } from '@kit/types';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const supabase = createServerSupabaseClient();

    // Fetch all sales for the year (with pagination to get all records)
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

    const data = allSales;

    const sales = (data || []).map(transformSale);

    // Calculate type breakdown
    const typeBreakdown: Record<string, number> = {};
    sales.forEach(sale => {
      typeBreakdown[sale.type] = (typeBreakdown[sale.type] || 0) + sale.amount;
    });

    // Group by month
    const monthlyData: Record<string, { total: number; count: number; byType: Record<string, number> }> = {};
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    months.forEach(month => {
      monthlyData[month] = { total: 0, count: 0, byType: {} };
    });

    sales.forEach(sale => {
      const month = sale.date.slice(5, 7);
      if (monthlyData[month]) {
        monthlyData[month].total += sale.amount;
        monthlyData[month].count += 1;
        monthlyData[month].byType[sale.type] = (monthlyData[month].byType[sale.type] || 0) + sale.amount;
      }
    });

    // Format monthly data for chart
    const monthlyChartData = months.map(month => ({
      month: `${year}-${month}`,
      revenue: monthlyData[month].total,
      count: monthlyData[month].count,
      average: monthlyData[month].count > 0 ? monthlyData[month].total / monthlyData[month].count : 0,
      ...monthlyData[month].byType,
    }));

    // Daily breakdown for current month
    const currentMonth = new Date().getMonth() + 1;
    const currentMonthStr = String(currentMonth).padStart(2, '0');
    const dailyData: Record<string, number> = {};
    sales
      .filter(sale => sale.date.startsWith(`${year}-${currentMonthStr}`))
      .forEach(sale => {
        const day = sale.date.slice(8, 10);
        dailyData[day] = (dailyData[day] || 0) + sale.amount;
      });

    const dailyChartData = Object.entries(dailyData)
      .map(([day, amount]) => ({
        day: `${year}-${currentMonthStr}-${day}`,
        revenue: amount,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Calculate totals and averages
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    const averageOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Best performing days (top 10)
    const dailyTotals: Record<string, number> = {};
    sales.forEach(sale => {
      dailyTotals[sale.date] = (dailyTotals[sale.date] || 0) + sale.amount;
    });

    const bestDays = Object.entries(dailyTotals)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return NextResponse.json({
      typeBreakdown: Object.entries(typeBreakdown).map(([type, amount]) => ({
        type,
        amount,
        percentage: (amount / totalRevenue) * 100,
      })),
      monthlyTrend: monthlyChartData,
      dailyTrend: dailyChartData,
      bestDays,
      summary: {
        totalRevenue,
        totalSales: sales.length,
        totalQuantity,
        averageOrderValue,
        averageDailyRevenue: totalRevenue / 365, // Approximate
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

