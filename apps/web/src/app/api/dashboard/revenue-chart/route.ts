// Dashboard Revenue Chart API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('sales')
      .select('date, amount')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    // Group by month
    const monthlyData: Record<string, number> = {};
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    months.forEach(month => {
      monthlyData[month] = 0;
    });

    (data || []).forEach((sale: any) => {
      const month = sale.date.slice(5, 7); // Extract MM from YYYY-MM-DD
      monthlyData[month] = (monthlyData[month] || 0) + parseFloat(sale.amount);
    });

    // Format for chart
    const chartData = months.map(month => ({
      month: `${year}-${month}`,
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

