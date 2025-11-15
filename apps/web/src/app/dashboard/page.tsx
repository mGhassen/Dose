"use client";

import { useAuth } from "@kit/hooks";
import { useFinancialKPIs, useRevenueChart, useExpensesChart, useProfitChart, useCashFlowChart } from "@kit/hooks";
import { useTranslations } from 'next-intl';
import { formatCurrency } from "@kit/lib/config";
import AppLayout from "@/components/app-layout";
import { useYear } from "@/contexts/year-context";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Users, 
  CreditCard,
  ArrowUpDown,
  BarChart3
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');
  const { selectedYear } = useYear();
  
  // Fetch data using selectedYear from context
  const { data: kpis, isLoading: kpisLoading } = useFinancialKPIs(selectedYear);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueChart(selectedYear);
  const { data: expensesData, isLoading: expensesLoading } = useExpensesChart(selectedYear);
  const { data: profitData, isLoading: profitLoading } = useProfitChart(selectedYear);
  const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlowChart(selectedYear);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || user?.email || 'User'}! Here's your financial overview.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.totalRevenue) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue for {selectedYear}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.totalExpenses) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis && kpis.totalRevenue > 0 ? `${((kpis.totalExpenses / kpis.totalRevenue) * 100).toFixed(1)}% of revenue` : 'No data'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis?.netProfit && kpis.netProfit < 0 ? 'text-red-500' : ''}`}>
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
              <p className="text-xs text-muted-foreground">
                Current cash balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Working Capital</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.workingCapital) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                BFR (Working Capital Need)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.totalDebt) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total active debt
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personnel Cost</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.personnelCost) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Annual personnel cost
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? '...' : kpis ? formatCurrency(kpis.grossProfit) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis && kpis.totalRevenue > 0 ? `${((kpis.grossProfit / kpis.totalRevenue) * 100).toFixed(1)}% margin` : 'No data'}
              </p>
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
