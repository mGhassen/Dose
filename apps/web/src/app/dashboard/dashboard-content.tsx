"use client";

import { useMemo } from "react";
import { useAuth } from "@kit/hooks";
import { useFinancialKPIs, useRevenueChart, useExpensesChart, useProfitChart, useCashFlowChart } from "@kit/hooks";
import { formatCurrency } from "@kit/lib/config";
import { formatShortDate } from "@kit/lib/date-format";
import AppLayout from "@/components/app-layout";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DashboardContent() {
  const { user } = useAuth();
  const { dateRange } = useDashboardPeriod();

  const apiParams = useMemo(
    () => ({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
    [dateRange.startDate, dateRange.endDate]
  );

  const { data: kpis, isLoading: kpisLoading } = useFinancialKPIs(apiParams);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueChart(apiParams);
  const { data: expensesData, isLoading: expensesLoading } = useExpensesChart(apiParams);
  const { data: profitData, isLoading: profitLoading } = useProfitChart(apiParams);
  const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlowChart(apiParams);

  const marginPct = kpis && kpis.totalRevenue > 0 ? ((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1) : null;
  const expenseRatioPct = kpis && kpis.totalRevenue > 0 ? ((kpis.totalExpenses / kpis.totalRevenue) * 100).toFixed(1) : null;

  const revenueVsExpensesData = useMemo(() => {
    if (!revenueData?.length && !expensesData?.length) return [];
    const months = new Set([
      ...(revenueData ?? []).map((d: { month: string }) => d.month),
      ...(expensesData ?? []).map((d: { month: string }) => d.month),
    ]);
    return Array.from(months).sort().map((month) => ({
      month,
      revenue: revenueData?.find((d: { month: string }) => d.month === month)?.revenue ?? 0,
      expenses: expensesData?.find((d: { month: string }) => d.month === month)?.expenses ?? 0,
    }));
  }, [revenueData, expensesData]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            {formatShortDate(dateRange.startDate)} – {formatShortDate(dateRange.endDate)} · {user?.firstName || user?.email || "User"}
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border">
              <div className="p-4 lg:p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</p>
                <p className="text-xl font-bold mt-1 tabular-nums">
                  {kpisLoading ? "…" : kpis ? formatCurrency(kpis.totalRevenue) : formatCurrency(0)}
                </p>
              </div>
              <div className="p-4 lg:p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
                <p className="text-xl font-bold mt-1 tabular-nums">
                  {kpisLoading ? "…" : kpis ? formatCurrency(kpis.totalExpenses) : formatCurrency(0)}
                </p>
              </div>
              <div className="p-4 lg:p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net profit</p>
                <p className={`text-xl font-bold mt-1 tabular-nums ${kpis?.netProfit != null && kpis.netProfit < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {kpisLoading ? "…" : kpis ? formatCurrency(kpis.netProfit) : formatCurrency(0)}
                </p>
                {marginPct != null && <p className="text-xs text-muted-foreground mt-0.5">{marginPct}% margin</p>}
              </div>
              <div className="p-4 lg:p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cash</p>
                <p className="text-xl font-bold mt-1 tabular-nums">
                  {kpisLoading ? "…" : kpis ? formatCurrency(kpis.cashBalance) : formatCurrency(0)}
                </p>
                {expenseRatioPct != null && <p className="text-xs text-muted-foreground mt-0.5">{expenseRatioPct}% expense ratio</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Working capital</p>
            <p className="font-semibold tabular-nums">{kpisLoading ? "…" : kpis ? formatCurrency(kpis.workingCapital) : formatCurrency(0)}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total debt</p>
            <p className="font-semibold tabular-nums">{kpisLoading ? "…" : kpis ? formatCurrency(kpis.totalDebt) : formatCurrency(0)}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Personnel cost</p>
            <p className="font-semibold tabular-nums">{kpisLoading ? "…" : kpis ? formatCurrency(kpis.personnelCost) : formatCurrency(0)}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Gross profit · Taxes</p>
            <p className="font-semibold tabular-nums">
              {kpisLoading ? "…" : kpis ? `${formatCurrency(kpis.grossProfit)} · ${formatCurrency(kpis.totalTaxes)}` : "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue & expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading || expensesLoading ? (
                <div className="h-[280px] flex items-center justify-center">Loading…</div>
              ) : revenueVsExpensesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profit</CardTitle>
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <div className="h-[280px] flex items-center justify-center">Loading…</div>
              ) : profitData && profitData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="profit" fill={profitData[0]?.profit != null && profitData[0].profit < 0 ? "#ef4444" : "#22c55e"} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Cash flow</CardTitle>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <div className="h-[280px] flex items-center justify-center">Loading…</div>
              ) : cashFlowData && cashFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="cashFlow" name="Cash flow" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="balance" name="Balance" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
