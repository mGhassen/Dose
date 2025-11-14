// Dashboard Profit Chart API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('profit_and_loss')
      .select('month, net_profit')
      .gte('month', `${year}-01`)
      .lte('month', `${year}-12`)
      .order('month', { ascending: true });

    if (error) throw error;

    // Create map of all months
    const monthlyData: Record<string, number> = {};
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    months.forEach(month => {
      monthlyData[month] = 0;
    });

    // Fill in actual data
    (data || []).forEach((pl: any) => {
      const month = pl.month.slice(5, 7); // Extract MM from YYYY-MM
      monthlyData[month] = parseFloat(pl.net_profit || '0');
    });

    // Format for chart
    const chartData = months.map(month => ({
      month: `${year}-${month}`,
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

