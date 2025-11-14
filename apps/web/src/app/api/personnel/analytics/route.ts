// Personnel Analytics API Route
// Provides data for charts and visualizations

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Personnel } from '@kit/types';

function transformPersonnel(row: any): Personnel {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    position: row.position,
    type: row.type,
    baseSalary: parseFloat(row.base_salary),
    employerCharges: parseFloat(row.employer_charges),
    employerChargesType: row.employer_charges_type,
    startDate: row.start_date,
    endDate: row.end_date,
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

    // Fetch all active personnel
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const personnel = (data || []).map(transformPersonnel);

    // Calculate type breakdown
    const typeBreakdown: Record<string, { count: number; totalCost: number }> = {};
    personnel.forEach(emp => {
      if (!typeBreakdown[emp.type]) {
        typeBreakdown[emp.type] = { count: 0, totalCost: 0 };
      }
      typeBreakdown[emp.type].count += 1;
      const monthlyCost = emp.baseSalary + (emp.employerCharges || 0);
      typeBreakdown[emp.type].totalCost += monthlyCost;
    });

    // Calculate position breakdown
    const positionBreakdown: Record<string, { count: number; totalCost: number }> = {};
    personnel.forEach(emp => {
      const position = emp.position || 'Other';
      if (!positionBreakdown[position]) {
        positionBreakdown[position] = { count: 0, totalCost: 0 };
      }
      positionBreakdown[position].count += 1;
      const monthlyCost = emp.baseSalary + (emp.employerCharges || 0);
      positionBreakdown[position].totalCost += monthlyCost;
    });

    // Project personnel costs for the year
    const startMonth = `${year}-01`;
    const endMonth = `${year}-12`;
    const projections: Record<string, { total: number; headcount: number; byType: Record<string, number> }> = {};
    
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);

    // Initialize all months
    let current = new Date(start);
    while (current <= end) {
      const month = current.toISOString().slice(0, 7);
      projections[month] = { total: 0, headcount: 0, byType: {} };
      current.setMonth(current.getMonth() + 1);
    }

    // Calculate costs for each personnel member
    for (const person of personnel) {
      const personStart = new Date(person.startDate);
      const personEnd = person.endDate ? new Date(person.endDate) : null;

      let current = new Date(Math.max(start.getTime(), personStart.getTime()));
      const finalDate = personEnd ? new Date(Math.min(end.getTime(), personEnd.getTime())) : end;

      while (current <= finalDate) {
        const month = current.toISOString().slice(0, 7);
        
        if (projections[month]) {
          const charges = person.employerChargesType === 'percentage'
            ? person.baseSalary * (person.employerCharges / 100)
            : person.employerCharges;
          const totalCost = person.baseSalary + charges;

          projections[month].total += totalCost;
          projections[month].headcount += 1;
          projections[month].byType[person.type] = 
            (projections[month].byType[person.type] || 0) + totalCost;
        }

        current.setMonth(current.getMonth() + 1);
      }
    }

    // Group by month for chart
    const monthlyData: Record<string, { total: number; headcount: number; byType: Record<string, number> }> = {};
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    months.forEach(month => {
      const monthKey = `${year}-${month}`;
      monthlyData[month] = projections[monthKey] || { total: 0, headcount: 0, byType: {} };
    });

    // Format monthly data for chart
    const monthlyChartData = months.map(month => {
      const monthKey = `${year}-${month}`;
      const data = monthlyData[month] || { total: 0, headcount: 0, byType: {} };
      return {
        month: monthKey,
        cost: data.total,
        headcount: data.headcount,
        ...data.byType,
      };
    });

    // Calculate totals
    const totalMonthlyCost = personnel.reduce((sum, emp) => {
      return sum + emp.baseSalary + (emp.employerCharges || 0);
    }, 0);

    const totalAnnualCost = totalMonthlyCost * 12;
    const averageSalary = personnel.length > 0 ? totalMonthlyCost / personnel.length : 0;

    // Top positions by cost
    const topPositions = Object.entries(positionBreakdown)
      .map(([position, data]) => ({
        position,
        count: data.count,
        monthlyCost: data.totalCost,
        annualCost: data.totalCost * 12,
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost)
      .slice(0, 10);

    return NextResponse.json({
      typeBreakdown: Object.entries(typeBreakdown).map(([type, data]) => ({
        type,
        count: data.count,
        monthlyCost: data.totalCost,
        percentage: (data.totalCost / totalMonthlyCost) * 100,
      })),
      positionBreakdown: Object.entries(positionBreakdown).map(([position, data]) => ({
        position,
        count: data.count,
        monthlyCost: data.totalCost,
        percentage: (data.totalCost / totalMonthlyCost) * 100,
      })),
      monthlyTrend: monthlyChartData,
      topPositions,
      summary: {
        totalPersonnel: personnel.length,
        totalMonthlyCost,
        totalAnnualCost,
        averageSalary,
        averageHeadcount: monthlyChartData.reduce((sum, m) => sum + m.headcount, 0) / 12,
      },
    });
  } catch (error: any) {
    console.error('Error fetching personnel analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personnel analytics', details: error.message },
      { status: 500 }
    );
  }
}

