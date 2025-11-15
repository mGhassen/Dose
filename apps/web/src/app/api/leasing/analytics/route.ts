// Leasing Analytics API Route
// Provides data for charts and visualizations

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { LeasingPayment } from '@kit/types';

function transformLeasing(row: any): LeasingPayment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    const supabase = createServerSupabaseClient();

    // Fetch all active leasing payments
    const { data, error } = await supabase
      .from('leasing_payments')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const leasing = (data || []).map(transformLeasing);

    // Calculate type breakdown
    const typeBreakdown: Record<string, { count: number; totalAmount: number }> = {};
    leasing.forEach(lease => {
      if (!typeBreakdown[lease.type]) {
        typeBreakdown[lease.type] = { count: 0, totalAmount: 0 };
      }
      typeBreakdown[lease.type].count += 1;
      // Calculate annual cost based on frequency
      let annualCost = 0;
      switch (lease.frequency) {
        case 'monthly':
          annualCost = lease.amount * 12;
          break;
        case 'quarterly':
          annualCost = lease.amount * 4;
          break;
        case 'yearly':
          annualCost = lease.amount;
          break;
        default:
          annualCost = lease.amount * 12;
      }
      typeBreakdown[lease.type].totalAmount += annualCost;
    });

    // Project leasing payments for the year
    const startMonth = `${year}-01`;
    const endMonth = `${year}-12`;
    const { projectLeasingPaymentsForRange } = await import('@/lib/calculations/leasing-timeline');
    const leasingProjections = projectLeasingPaymentsForRange(leasing, startMonth, endMonth);

    // Group by month
    const monthlyData: Record<string, { total: number; byType: Record<string, number> }> = {};
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    months.forEach(month => {
      monthlyData[month] = { total: 0, byType: {} };
    });

    leasingProjections.forEach(proj => {
      const month = proj.month.slice(5, 7);
      if (monthlyData[month]) {
        monthlyData[month].total += proj.amount;
        // Find the leasing type from the original leasing array
        const lease = leasing.find(l => l.id === proj.leasingId);
        const leaseType = lease?.type || 'unknown';
        monthlyData[month].byType[leaseType] = 
          (monthlyData[month].byType[leaseType] || 0) + proj.amount;
      }
    });

    // Format monthly data for chart
    const monthlyChartData = months.map(month => ({
      month: `${year}-${month}`,
      total: monthlyData[month].total,
      ...monthlyData[month].byType,
    }));

    // Calculate totals
    const totalMonthly = leasing.reduce((sum, lease) => {
      switch (lease.frequency) {
        case 'monthly':
          return sum + lease.amount;
        case 'quarterly':
          return sum + lease.amount / 3;
        case 'yearly':
          return sum + lease.amount / 12;
        default:
          return sum + lease.amount;
      }
    }, 0);

    const totalAnnual = totalMonthly * 12;

    // Top leases by annual cost
    const topLeases = leasing
      .map(lease => {
        let annualCost = 0;
        switch (lease.frequency) {
          case 'monthly':
            annualCost = lease.amount * 12;
            break;
          case 'quarterly':
            annualCost = lease.amount * 4;
            break;
          case 'yearly':
            annualCost = lease.amount;
            break;
          default:
            annualCost = lease.amount * 12;
        }
        return { ...lease, annualCost };
      })
      .sort((a, b) => b.annualCost - a.annualCost)
      .slice(0, 10);

    return NextResponse.json({
      typeBreakdown: Object.entries(typeBreakdown).map(([type, data]) => ({
        type,
        count: data.count,
        annualCost: data.totalAmount,
        percentage: (data.totalAmount / Object.values(typeBreakdown).reduce((sum, d) => sum + d.totalAmount, 0)) * 100,
      })),
      monthlyTrend: monthlyChartData,
      topLeases: topLeases.map(lease => ({
        id: lease.id,
        name: lease.name,
        type: lease.type,
        monthlyAmount: lease.amount,
        annualCost: lease.annualCost,
      })),
      summary: {
        totalLeases: leasing.length,
        totalMonthly,
        totalAnnual,
        avgMonthly: leasing.length > 0 ? totalMonthly / leasing.length : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching leasing analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leasing analytics', details: error.message },
      { status: 500 }
    );
  }
}

