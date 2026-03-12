"use client";

import { useMemo } from "react";
import { useAuth } from "@kit/hooks";
import { useFinancialKPIs, useRevenueChart, useExpensesChart, useProfitChart, useCashFlowChart } from "@kit/hooks";
import { formatCurrency } from "@kit/lib/config";
import { formatShortDate } from "@kit/lib/date-format";
import AppLayout from "@/components/app-layout";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Users,
  CreditCard,
  BarChart3,
} from "lucide-react";
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Financial Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName || user?.email || "User"}! Here&apos;s your financial overview.
            </p>
          </div>
        </div>

        {/* Key metrics — main 3 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.totalRevenue) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatShortDate(dateRange.startDate)} – {formatShortDate(dateRange.endDate)}
              </p>
            </CardContent>
          </Card>
          <Card className={kpis?.netProfit != null && kpis.netProfit < 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-green-200 bg-green-50/50 dark:bg-green-950/20'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis?.netProfit != null && kpis.netProfit < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.netProfit) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis && kpis.totalRevenue > 0 ? `${((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1)}% margin` : 'No data'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.cashBalance) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">Current balance</p>
            </CardContent>
          </Card>
        </div>

        {/* P&L detail — one card with table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income & costs</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              {formatShortDate(dateRange.startDate)} – {formatShortDate(dateRange.endDate)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex justify-between gap-2 rounded-lg border p-3 sm:flex-col sm:justify-start">
                <span className="text-xs text-muted-foreground">Revenue</span>
                <span className="font-semibold tabular-nums">{kpisLoading ? '...' : kpis ? formatCurrency(kpis.totalRevenue) : formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between gap-2 rounded-lg border p-3 sm:flex-col sm:justify-start">
                <span className="text-xs text-muted-foreground">Expenses</span>
                <span className="font-semibold tabular-nums">{kpisLoading ? '...' : kpis ? formatCurrency(kpis.totalExpenses) : formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between gap-2 rounded-lg border p-3 sm:flex-col sm:justify-start">
                <span className="text-xs text-muted-foreground">Gross profit</span>
                <span className="font-semibold tabular-nums">{kpisLoading ? '...' : kpis ? formatCurrency(kpis.grossProfit) : formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between gap-2 rounded-lg border p-3 sm:flex-col sm:justify-start">
                <span className="text-xs text-muted-foreground">Taxes</span>
                <span className="font-semibold tabular-nums">{kpisLoading ? '...' : kpis ? formatCurrency(kpis.totalTaxes) : formatCurrency(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance sheet & other KPIs — compact row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Working capital</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{kpisLoading ? '...' : kpis ? formatCurrency(kpis.workingCapital) : formatCurrency(0)}</div>
              <p className="text-xs text-muted-foreground">BFR</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total debt</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{kpisLoading ? '...' : kpis ? formatCurrency(kpis.totalDebt) : formatCurrency(0)}</div>
              <p className="text-xs text-muted-foreground">Active debt</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personnel cost</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{kpisLoading ? '...' : kpis ? formatCurrency(kpis.personnelCost) : formatCurrency(0)}</div>
              <p className="text-xs text-muted-foreground">Period total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses / revenue</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {kpis && kpis.totalRevenue > 0 ? `${((kpis.totalExpenses / kpis.totalRevenue) * 100).toFixed(1)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">Expense ratio</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expenses Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : expensesData && expensesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={expensesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expenses data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profit Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : profitData && profitData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="profit" fill={profitData[0]?.profit < 0 ? "#ef4444" : "#22c55e"} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No profit data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : cashFlowData && cashFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="cashFlow" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No cash flow data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
