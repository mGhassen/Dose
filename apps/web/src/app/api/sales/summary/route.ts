// Sales Summary API Route
// Returns monthly sales summaries by type

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { lastDayYmdForYm, timestamptzBoundsFromYmdRange } from '@kit/lib';
import type { SalesSummary, Sale, SalesType } from '@kit/types';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('start');
    const endMonth = searchParams.get('end');

    if (!startMonth || !endMonth) {
      return NextResponse.json(
        { error: 'start and end month parameters are required (YYYY-MM)' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    
    const salesDateBounds = timestamptzBoundsFromYmdRange(
      `${startMonth}-01`,
      lastDayYmdForYm(endMonth)
    );

    // Fetch all sales with pagination to get all records
    let allSales: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('date', salesDateBounds.gte)
        .lte('date', salesDateBounds.lte)
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

    const sales: Sale[] = (data || []).map(transformSale);

    // Group by month and type
    const monthlyData: Record<string, {
      onSite: number;
      delivery: number;
      takeaway: number;
      catering: number;
      other: number;
    }> = {};

    for (const sale of sales) {
      const month = sale.date.slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = {
          onSite: 0,
          delivery: 0,
          takeaway: 0,
          catering: 0,
          other: 0,
        };
      }

      switch (sale.type) {
        case 'on_site':
          monthlyData[month].onSite += sale.amount;
          break;
        case 'delivery':
          monthlyData[month].delivery += sale.amount;
          break;
        case 'takeaway':
          monthlyData[month].takeaway += sale.amount;
          break;
        case 'catering':
          monthlyData[month].catering += sale.amount;
          break;
        default:
          monthlyData[month].other += sale.amount;
      }
    }

    // Convert to array format
    const summaries: SalesSummary[] = Object.keys(monthlyData)
      .sort()
      .map(month => ({
        month,
        onSite: monthlyData[month].onSite,
        delivery: monthlyData[month].delivery,
        takeaway: monthlyData[month].takeaway,
        catering: monthlyData[month].catering,
        other: monthlyData[month].other,
        total: monthlyData[month].onSite + 
               monthlyData[month].delivery + 
               monthlyData[month].takeaway + 
               monthlyData[month].catering + 
               monthlyData[month].other,
      }));

    return NextResponse.json(summaries);
  } catch (error: any) {
    console.error('Error calculating sales summary:', error);
    return NextResponse.json(
      { error: 'Failed to calculate sales summary', details: error.message },
      { status: 500 }
    );
  }
}

