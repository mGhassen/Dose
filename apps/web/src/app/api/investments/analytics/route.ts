// Investments Analytics API Route
// Provides data for charts and visualizations

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Investment, DepreciationEntry } from '@kit/types';

function transformInvestment(row: any): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    purchaseDate: row.purchase_date,
    usefulLifeMonths: row.useful_life_months,
    depreciationMethod: row.depreciation_method,
    residualValue: parseFloat(row.residual_value),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformDepreciationEntry(row: any): DepreciationEntry {
  return {
    id: row.id,
    investmentId: row.investment_id,
    month: row.month,
    depreciationAmount: parseFloat(row.depreciation_amount),
    accumulatedDepreciation: parseFloat(row.accumulated_depreciation),
    bookValue: parseFloat(row.book_value),
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch all investments
    const { data: investmentsData, error: investmentsError } = await supabase
      .from('investments')
      .select('*');

    if (investmentsError) throw investmentsError;

    const investments = (investmentsData || []).map(transformInvestment);

    // Fetch all depreciation entries
    const { data: depreciationData, error: depreciationError } = await supabase
      .from('depreciation_entries')
      .select('*')
      .order('month', { ascending: true });

    if (depreciationError) throw depreciationError;

    const depreciationEntries = (depreciationData || []).map(transformDepreciationEntry);

    // Calculate type breakdown
    const typeBreakdown: Record<string, { count: number; totalAmount: number; totalBookValue: number }> = {};
    investments.forEach(inv => {
      if (!typeBreakdown[inv.type]) {
        typeBreakdown[inv.type] = { count: 0, totalAmount: 0, totalBookValue: 0 };
      }
      typeBreakdown[inv.type].count += 1;
      typeBreakdown[inv.type].totalAmount += inv.amount;
      
      // Calculate current book value
      const invDepreciation = depreciationEntries.filter(d => d.investmentId === inv.id);
      const latestDepreciation = invDepreciation[invDepreciation.length - 1];
      const currentBookValue = latestDepreciation?.bookValue || inv.amount;
      typeBreakdown[inv.type].totalBookValue += currentBookValue;
    });

    // Group depreciation by month
    const monthlyDepreciation: Record<string, { total: number; byType: Record<string, number> }> = {};
    depreciationEntries.forEach(entry => {
      if (!monthlyDepreciation[entry.month]) {
        monthlyDepreciation[entry.month] = { total: 0, byType: {} };
      }
      monthlyDepreciation[entry.month].total += entry.depreciationAmount;
      
      const investment = investments.find(inv => inv.id === entry.investmentId);
      const type = investment?.type || 'unknown';
      monthlyDepreciation[entry.month].byType[type] = 
        (monthlyDepreciation[entry.month].byType[type] || 0) + entry.depreciationAmount;
    });

    // Format monthly data for chart
    const monthlyChartData = Object.entries(monthlyDepreciation)
      .map(([month, data]) => ({
        month,
        total: data.total,
        ...data.byType,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate asset value over time
    const assetValueOverTime: Record<string, { purchaseValue: number; bookValue: number }> = {};
    investments.forEach(inv => {
      const purchaseMonth = inv.purchaseDate.slice(0, 7);
      if (!assetValueOverTime[purchaseMonth]) {
        assetValueOverTime[purchaseMonth] = { purchaseValue: 0, bookValue: 0 };
      }
      assetValueOverTime[purchaseMonth].purchaseValue += inv.amount;
    });

    // Add book value for each month - need to track all months where investments exist
    const allMonths = new Set<string>();
    investments.forEach(inv => {
      allMonths.add(inv.purchaseDate.slice(0, 7));
    });
    depreciationEntries.forEach(entry => {
      allMonths.add(entry.month);
    });

    Array.from(allMonths).sort().forEach(month => {
      if (!assetValueOverTime[month]) {
        assetValueOverTime[month] = { purchaseValue: 0, bookValue: 0 };
      }
      // Calculate total book value for this month
      const totalBookValue = investments.reduce((sum, inv) => {
        // Only include if investment was purchased by this month
        if (inv.purchaseDate.slice(0, 7) > month) {
          return sum;
        }
        const invDepreciation = depreciationEntries
          .filter(d => d.investmentId === inv.id && d.month <= month)
          .sort((a, b) => b.month.localeCompare(a.month));
        const latest = invDepreciation[0];
        return sum + (latest?.bookValue || inv.amount);
      }, 0);
      assetValueOverTime[month].bookValue = totalBookValue;
    });

    const assetValueChartData = Object.entries(assetValueOverTime)
      .map(([month, data]) => ({
        month,
        purchaseValue: data.purchaseValue,
        bookValue: data.bookValue,
        depreciation: data.purchaseValue - data.bookValue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate totals
    const totalPurchaseValue = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalDepreciation = depreciationEntries.reduce((sum, entry) => sum + entry.depreciationAmount, 0);
    const totalAccumulatedDepreciation = depreciationEntries.length > 0
      ? depreciationEntries[depreciationEntries.length - 1]?.accumulatedDepreciation || 0
      : 0;
    const totalBookValue = investments.reduce((sum, inv) => {
      const invDepreciation = depreciationEntries.filter(d => d.investmentId === inv.id);
      const latest = invDepreciation[invDepreciation.length - 1];
      return sum + (latest?.bookValue || inv.amount);
    }, 0);

    // Top investments by value
    const topInvestments = investments
      .map(inv => {
        const invDepreciation = depreciationEntries.filter(d => d.investmentId === inv.id);
        const latest = invDepreciation[invDepreciation.length - 1];
        const bookValue = latest?.bookValue || inv.amount;
        return { ...inv, bookValue, depreciation: inv.amount - bookValue };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Depreciation method breakdown
    const methodBreakdown: Record<string, { count: number; totalAmount: number }> = {};
    investments.forEach(inv => {
      if (!methodBreakdown[inv.depreciationMethod]) {
        methodBreakdown[inv.depreciationMethod] = { count: 0, totalAmount: 0 };
      }
      methodBreakdown[inv.depreciationMethod].count += 1;
      methodBreakdown[inv.depreciationMethod].totalAmount += inv.amount;
    });

    return NextResponse.json({
      typeBreakdown: Object.entries(typeBreakdown).map(([type, data]) => ({
        type,
        count: data.count,
        totalAmount: data.totalAmount,
        totalBookValue: data.totalBookValue,
        totalDepreciation: data.totalAmount - data.totalBookValue,
        percentage: (data.totalAmount / totalPurchaseValue) * 100,
      })),
      monthlyDepreciation: monthlyChartData,
      assetValueOverTime: assetValueChartData,
      methodBreakdown: Object.entries(methodBreakdown).map(([method, data]) => ({
        method,
        count: data.count,
        totalAmount: data.totalAmount,
        percentage: (data.totalAmount / totalPurchaseValue) * 100,
      })),
      topInvestments: topInvestments.map(inv => ({
        id: inv.id,
        name: inv.name,
        type: inv.type,
        purchaseValue: inv.amount,
        bookValue: inv.bookValue,
        depreciation: inv.depreciation,
      })),
      summary: {
        totalInvestments: investments.length,
        totalPurchaseValue,
        totalDepreciation,
        totalAccumulatedDepreciation,
        totalBookValue,
        avgInvestmentValue: investments.length > 0 ? totalPurchaseValue / investments.length : 0,
        depreciationRate: totalPurchaseValue > 0 ? (totalDepreciation / totalPurchaseValue) * 100 : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching investments analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investments analytics', details: error.message },
      { status: 500 }
    );
  }
}

