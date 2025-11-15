// Loans Analytics API Route
// Provides data for charts and visualizations

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Loan, LoanScheduleEntry } from '@kit/types';

function transformLoan(row: any): Loan {
  return {
    id: row.id,
    name: row.name,
    loanNumber: row.loan_number,
    principalAmount: parseFloat(row.principal_amount),
    interestRate: parseFloat(row.interest_rate),
    durationMonths: row.duration_months,
    startDate: row.start_date,
    status: row.status,
    lender: row.lender,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformLoanSchedule(row: any): LoanScheduleEntry {
  return {
    id: row.id,
    loanId: row.loan_id,
    month: row.month,
    paymentDate: row.payment_date,
    principalPayment: parseFloat(row.principal_payment),
    interestPayment: parseFloat(row.interest_payment),
    totalPayment: parseFloat(row.total_payment),
    remainingBalance: parseFloat(row.remaining_balance),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch all loans
    const { data: loansData, error: loansError } = await supabase
      .from('loans')
      .select('*');

    if (loansError) throw loansError;

    const loans = (loansData || []).map(transformLoan);

    // Fetch all loan schedules
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('loan_schedules')
      .select('*')
      .order('payment_date', { ascending: true });

    if (schedulesError) throw schedulesError;

    const schedules = (schedulesData || []).map(transformLoanSchedule);

    // Calculate status breakdown
    const statusBreakdown: Record<string, { count: number; totalPrincipal: number }> = {};
    loans.forEach(loan => {
      if (!statusBreakdown[loan.status]) {
        statusBreakdown[loan.status] = { count: 0, totalPrincipal: 0 };
      }
      statusBreakdown[loan.status].count += 1;
      statusBreakdown[loan.status].totalPrincipal += loan.principalAmount;
    });

    // Group payments by month
    const monthlyPayments: Record<string, { principal: number; interest: number; total: number; count: number }> = {};
    schedules.forEach(schedule => {
      const month = schedule.paymentDate.slice(0, 7); // YYYY-MM
      if (!monthlyPayments[month]) {
        monthlyPayments[month] = { principal: 0, interest: 0, total: 0, count: 0 };
      }
      monthlyPayments[month].principal += schedule.principalPayment;
      monthlyPayments[month].interest += schedule.interestPayment;
      monthlyPayments[month].total += schedule.totalPayment;
      monthlyPayments[month].count += 1;
    });

    // Format monthly data for chart
    const monthlyChartData = Object.entries(monthlyPayments)
      .map(([month, data]) => ({
        month,
        principal: data.principal,
        interest: data.interest,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate totals
    const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);
    const totalInterest = schedules.reduce((sum, s) => sum + s.interestPayment, 0);
    const totalPaid = schedules.filter(s => s.isPaid).reduce((sum, s) => sum + s.totalPayment, 0);
    const totalRemaining = loans
      .filter(l => l.status === 'active')
      .reduce((sum, loan) => {
        const loanSchedules = schedules.filter(s => s.loanId === loan.id);
        const latestSchedule = loanSchedules[loanSchedules.length - 1];
        return sum + (latestSchedule?.remainingBalance || loan.principalAmount);
      }, 0);

    // Upcoming payments (next 12 months)
    const now = new Date();
    const next12Months = new Date(now);
    next12Months.setMonth(next12Months.getMonth() + 12);
    const upcomingPayments = schedules
      .filter(s => {
        const paymentDate = new Date(s.paymentDate);
        return paymentDate >= now && paymentDate <= next12Months && !s.isPaid;
      })
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      .slice(0, 12);

    // Group upcoming by month
    const upcomingByMonth: Record<string, number> = {};
    upcomingPayments.forEach(payment => {
      const month = payment.paymentDate.slice(0, 7);
      upcomingByMonth[month] = (upcomingByMonth[month] || 0) + payment.totalPayment;
    });

    const upcomingChartData = Object.entries(upcomingByMonth)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      statusBreakdown: Object.entries(statusBreakdown).map(([status, data]) => ({
        status,
        count: data.count,
        totalPrincipal: data.totalPrincipal,
        percentage: (data.totalPrincipal / totalPrincipal) * 100,
      })),
      monthlyPayments: monthlyChartData,
      upcomingPayments: upcomingChartData,
      summary: {
        totalLoans: loans.length,
        activeLoans: loans.filter(l => l.status === 'active').length,
        totalPrincipal,
        totalInterest,
        totalPaid,
        totalRemaining,
        avgInterestRate: loans.length > 0 
          ? loans.reduce((sum, l) => sum + l.interestRate, 0) / loans.length 
          : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching loans analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans analytics', details: error.message },
      { status: 500 }
    );
  }
}

