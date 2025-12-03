"use client";

import { useMemo } from "react";
import { useYear } from "@/contexts/year-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { Badge } from "@kit/ui/badge";
import AppLayout from "@/components/app-layout";
import { formatCurrency } from "@kit/lib/config";
import { formatMonthYear } from "@kit/lib/date-format";
import { 
  useProfitLoss,
  useBalanceSheet,
  useCashFlow,
  useWorkingCapital,
  useFinancialPlan
} from "@kit/hooks";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Wallet, 
  BarChart3,
  Percent,
  Activity,
  Target,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function FinancialStatementContent() {
  const { selectedYear } = useYear();
  
  const { data: profitLossData, isLoading: plLoading } = useProfitLoss();
  const { data: balanceSheetData, isLoading: bsLoading } = useBalanceSheet();
  const { data: cashFlowData, isLoading: cfLoading } = useCashFlow();
  const { data: workingCapitalData, isLoading: wcLoading } = useWorkingCapital();
  const { data: financialPlanData, isLoading: fpLoading } = useFinancialPlan();

  const isLoading = plLoading || bsLoading || cfLoading || wcLoading || fpLoading;

  // Filter data by selected year
  const filteredProfitLoss = useMemo(() => {
    if (!profitLossData) return [];
    return profitLossData
      .filter(pl => pl.month.startsWith(selectedYear))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [profitLossData, selectedYear]);

  const filteredBalanceSheet = useMemo(() => {
    if (!balanceSheetData) return [];
    return balanceSheetData
      .filter(bs => bs.month.startsWith(selectedYear))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [balanceSheetData, selectedYear]);

  const filteredCashFlow = useMemo(() => {
    if (!cashFlowData) return [];
    return cashFlowData
      .filter(cf => cf.month.startsWith(selectedYear))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [cashFlowData, selectedYear]);

  const filteredWorkingCapital = useMemo(() => {
    if (!workingCapitalData) return [];
    return workingCapitalData
      .filter(wc => wc.month.startsWith(selectedYear))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [workingCapitalData, selectedYear]);

  const filteredFinancialPlan = useMemo(() => {
    if (!financialPlanData) return [];
    return financialPlanData
      .filter(fp => fp.month.startsWith(selectedYear))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [financialPlanData, selectedYear]);

  // Combine all data for comprehensive view
  const combinedData = useMemo(() => {
    const months = new Set<string>();
    
    filteredProfitLoss.forEach(pl => months.add(pl.month));
    filteredBalanceSheet.forEach(bs => months.add(bs.month));
    filteredCashFlow.forEach(cf => months.add(cf.month));
    filteredWorkingCapital.forEach(wc => months.add(wc.month));
    filteredFinancialPlan.forEach(fp => months.add(fp.month));

    return Array.from(months)
      .sort()
      .map(month => {
        const pl = filteredProfitLoss.find(p => p.month === month);
        const bs = filteredBalanceSheet.find(b => b.month === month);
        const cf = filteredCashFlow.find(c => c.month === month);
        const wc = filteredWorkingCapital.find(w => w.month === month);
        const fp = filteredFinancialPlan.find(f => f.month === month);

        return {
          month,
          revenue: pl?.totalRevenue || 0,
          grossProfit: pl?.grossProfit || 0,
          operatingProfit: pl?.operatingProfit || 0,
          netProfit: pl?.netProfit || 0,
          totalExpenses: (pl?.costOfGoodsSold || 0) + (pl?.operatingExpenses || 0) + (pl?.personnelCosts || 0) + (pl?.leasingCosts || 0) + (pl?.depreciation || 0) + (pl?.interestExpense || 0) + (pl?.taxes || 0) + (pl?.otherExpenses || 0),
          totalAssets: bs?.totalAssets || 0,
          currentAssets: bs?.currentAssets || 0,
          fixedAssets: bs?.fixedAssets || 0,
          totalLiabilities: bs?.totalLiabilities || 0,
          currentLiabilities: bs?.currentLiabilities || 0,
          longTermDebt: bs?.longTermDebt || 0,
          totalEquity: bs?.totalEquity || 0,
          openingBalance: cf?.openingBalance || 0,
          cashInflows: cf?.cashInflows || 0,
          cashOutflows: cf?.cashOutflows || 0,
          netCashFlow: cf?.netCashFlow || 0,
          closingBalance: cf?.closingBalance || 0,
          workingCapitalNeed: wc?.workingCapitalNeed || 0,
          netFinancing: fp?.netFinancing || 0,
        };
      });
  }, [filteredProfitLoss, filteredBalanceSheet, filteredCashFlow, filteredWorkingCapital, filteredFinancialPlan]);

  // Calculate comprehensive summary statistics
  const summary = useMemo(() => {
    if (combinedData.length === 0) return null;

    const latest = combinedData[combinedData.length - 1];
    const first = combinedData[0];
    const totalRevenue = combinedData.reduce((sum, d) => sum + d.revenue, 0);
    const totalProfit = combinedData.reduce((sum, d) => sum + d.netProfit, 0);
    const totalExpenses = combinedData.reduce((sum, d) => sum + d.totalExpenses, 0);
    const avgCashBalance = combinedData.reduce((sum, d) => sum + d.closingBalance, 0) / combinedData.length;
    const totalCashInflows = combinedData.reduce((sum, d) => sum + d.cashInflows, 0);
    const totalCashOutflows = combinedData.reduce((sum, d) => sum + d.cashOutflows, 0);

    // Financial ratios
    const currentRatio = latest.currentLiabilities > 0 ? (latest.currentAssets / latest.currentLiabilities) : 0;
    const debtToEquity = latest.totalEquity > 0 ? (latest.totalLiabilities / latest.totalEquity) : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const grossMargin = totalRevenue > 0 ? (combinedData.reduce((sum, d) => sum + d.grossProfit, 0) / totalRevenue) * 100 : 0;
    const operatingMargin = totalRevenue > 0 ? (combinedData.reduce((sum, d) => sum + d.operatingProfit, 0) / totalRevenue) * 100 : 0;
    const roa = latest.totalAssets > 0 ? (totalProfit / latest.totalAssets) * 100 : 0; // Return on Assets
    const roe = latest.totalEquity > 0 ? (totalProfit / latest.totalEquity) * 100 : 0; // Return on Equity

    return {
      totalRevenue,
      totalProfit,
      totalExpenses,
      avgCashBalance,
      totalCashInflows,
      totalCashOutflows,
      latestAssets: latest.totalAssets,
      latestEquity: latest.totalEquity,
      latestLiabilities: latest.totalLiabilities,
      revenueGrowth: first.revenue > 0 ? ((latest.revenue - first.revenue) / first.revenue) * 100 : 0,
      profitMargin,
      grossMargin,
      operatingMargin,
      assetsGrowth: first.totalAssets > 0 ? ((latest.totalAssets - first.totalAssets) / first.totalAssets) * 100 : 0,
      equityGrowth: first.totalEquity > 0 ? ((latest.totalEquity - first.totalEquity) / first.totalEquity) * 100 : 0,
      currentRatio,
      debtToEquity,
      roa,
      roe,
    };
  }, [combinedData]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (combinedData.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Statement</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive overview of all financial metrics and performance indicators
            </p>
          </div>
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No financial data available for {selectedYear}. Please generate financial statements first.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Statement</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive financial overview for {selectedYear} - Income Statement, Balance Sheet, Cash Flow, and Key Ratios
          </p>
        </div>

        {/* Executive Summary */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Executive Summary
              </CardTitle>
              <CardDescription>
                Key financial highlights and performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
                  <div className="text-xs">
                    {summary.revenueGrowth >= 0 ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{summary.revenueGrowth.toFixed(1)}% vs start of year
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {summary.revenueGrowth.toFixed(1)}% vs start of year
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Net Profit</div>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalProfit)}</div>
                  <div className="text-xs text-muted-foreground">
                    {summary.profitMargin.toFixed(1)}% profit margin
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Total Assets</div>
                  <div className="text-2xl font-bold">{formatCurrency(summary.latestAssets)}</div>
                  <div className="text-xs">
                    {summary.assetsGrowth >= 0 ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{summary.assetsGrowth.toFixed(1)}% vs start of year
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {summary.assetsGrowth.toFixed(1)}% vs start of year
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Average Cash Balance</div>
                  <div className="text-2xl font-bold">{formatCurrency(summary.avgCashBalance)}</div>
                  <div className="text-xs text-muted-foreground">
                    Monthly average
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Ratios */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Financial Ratios & Health Indicators
              </CardTitle>
              <CardDescription>
                Key financial ratios to assess business health and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Profit Margin</div>
                  <div className="text-2xl font-bold">{summary.profitMargin.toFixed(1)}%</div>
                  <div className="text-xs">
                    {summary.profitMargin >= 10 ? (
                      <Badge variant="default" className="text-xs">Excellent</Badge>
                    ) : summary.profitMargin >= 5 ? (
                      <Badge variant="outline" className="text-xs">Good</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Needs Improvement</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Gross Margin</div>
                  <div className="text-2xl font-bold">{summary.grossMargin.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    Revenue after COGS
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Operating Margin</div>
                  <div className="text-2xl font-bold">{summary.operatingMargin.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    Operating efficiency
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Current Ratio</div>
                  <div className="text-2xl font-bold">{summary.currentRatio.toFixed(2)}</div>
                  <div className="text-xs">
                    {summary.currentRatio >= 2 ? (
                      <Badge variant="default" className="text-xs">Strong</Badge>
                    ) : summary.currentRatio >= 1 ? (
                      <Badge variant="outline" className="text-xs">Adequate</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Low</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Debt-to-Equity</div>
                  <div className="text-2xl font-bold">{summary.debtToEquity.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    Financial leverage
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Return on Assets (ROA)</div>
                  <div className="text-2xl font-bold">{summary.roa.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    Asset efficiency
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Return on Equity (ROE)</div>
                  <div className="text-2xl font-bold">{summary.roe.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    Shareholder return
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Equity Growth</div>
                  <div className="text-2xl font-bold">
                    {summary.equityGrowth >= 0 ? '+' : ''}{summary.equityGrowth.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Year-over-year
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Financial Statements */}
        <Tabs defaultValue="income-statement" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            <TabsTrigger value="trends">Trends & Analysis</TabsTrigger>
          </TabsList>

          {/* Income Statement Tab */}
          <TabsContent value="income-statement" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Income Statement (Profit & Loss)</CardTitle>
                <CardDescription>
                  Revenue, expenses, and profitability for {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-semibold">Item</th>
                          {combinedData.map((d) => {
                            const [year, month] = d.month.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1);
                            return (
                              <th key={d.month} className="text-right p-3 font-semibold">
                                {formatMonthYear(date)}
                              </th>
                            );
                          })}
                          <th className="text-right p-3 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="p-3 font-medium">Revenue</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3">
                              {formatCurrency(d.revenue)}
                            </td>
                          ))}
                          <td className="text-right p-3 font-semibold">
                            {formatCurrency(combinedData.reduce((sum, d) => sum + d.revenue, 0))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Cost of Goods Sold</td>
                          {combinedData.map((d) => {
                            const pl = filteredProfitLoss.find(p => p.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3 text-muted-foreground">
                                {formatCurrency(pl?.costOfGoodsSold || 0)}
                              </td>
                            );
                          })}
                          <td className="text-right p-3 text-muted-foreground">
                            {formatCurrency(filteredProfitLoss.reduce((sum, pl) => sum + (pl.costOfGoodsSold || 0), 0))}
                          </td>
                        </tr>
                        <tr className="border-t-2">
                          <td className="p-3 font-semibold">Gross Profit</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 font-semibold">
                              {formatCurrency(d.grossProfit)}
                            </td>
                          ))}
                          <td className="text-right p-3 font-semibold">
                            {formatCurrency(combinedData.reduce((sum, d) => sum + d.grossProfit, 0))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Operating Expenses</td>
                          {combinedData.map((d) => {
                            const pl = filteredProfitLoss.find(p => p.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3 text-muted-foreground">
                                {formatCurrency(pl?.operatingExpenses || 0)}
                              </td>
                            );
                          })}
                          <td className="text-right p-3 text-muted-foreground">
                            {formatCurrency(filteredProfitLoss.reduce((sum, pl) => sum + (pl.operatingExpenses || 0), 0))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Personnel Costs</td>
                          {combinedData.map((d) => {
                            const pl = filteredProfitLoss.find(p => p.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3 text-muted-foreground">
                                {formatCurrency(pl?.personnelCosts || 0)}
                              </td>
                            );
                          })}
                          <td className="text-right p-3 text-muted-foreground">
                            {formatCurrency(filteredProfitLoss.reduce((sum, pl) => sum + (pl.personnelCosts || 0), 0))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Leasing Costs</td>
                          {combinedData.map((d) => {
                            const pl = filteredProfitLoss.find(p => p.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3 text-muted-foreground">
                                {formatCurrency(pl?.leasingCosts || 0)}
                              </td>
                            );
                          })}
                          <td className="text-right p-3 text-muted-foreground">
                            {formatCurrency(filteredProfitLoss.reduce((sum, pl) => sum + (pl.leasingCosts || 0), 0))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Depreciation</td>
                          {combinedData.map((d) => {
                            const pl = filteredProfitLoss.find(p => p.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3 text-muted-foreground">
                                {formatCurrency(pl?.depreciation || 0)}
                              </td>
                            );
                          })}
                          <td className="text-right p-3 text-muted-foreground">
                            {formatCurrency(filteredProfitLoss.reduce((sum, pl) => sum + (pl.depreciation || 0), 0))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Interest Expense</td>
                          {combinedData.map((d) => {
                            const pl = filteredProfitLoss.find(p => p.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3 text-muted-foreground">
                                {formatCurrency(pl?.interestExpense || 0)}
                              </td>
                            );
                          })}
                          <td className="text-right p-3 text-muted-foreground">
                            {formatCurrency(filteredProfitLoss.reduce((sum, pl) => sum + (pl.interestExpense || 0), 0))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Taxes</td>
                          {combinedData.map((d) => {
                            const pl = filteredProfitLoss.find(p => p.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3 text-muted-foreground">
                                {formatCurrency(pl?.taxes || 0)}
                              </td>
                            );
                          })}
                          <td className="text-right p-3 text-muted-foreground">
                            {formatCurrency(filteredProfitLoss.reduce((sum, pl) => sum + (pl.taxes || 0), 0))}
                          </td>
                        </tr>
                        <tr className="border-t-2">
                          <td className="p-3 font-semibold">Operating Profit</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 font-semibold">
                              {formatCurrency(d.operatingProfit)}
                            </td>
                          ))}
                          <td className="text-right p-3 font-semibold">
                            {formatCurrency(combinedData.reduce((sum, d) => sum + d.operatingProfit, 0))}
                          </td>
                        </tr>
                        <tr className="border-t-2 border-primary bg-primary/5">
                          <td className="p-3 font-bold text-lg">Net Profit</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 font-bold text-lg">
                              {formatCurrency(d.netProfit)}
                            </td>
                          ))}
                          <td className="text-right p-3 font-bold text-lg">
                            {formatCurrency(combinedData.reduce((sum, d) => sum + d.netProfit, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Chart */}
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={combinedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tickFormatter={(value) => {
                            const [year, month] = value.split('-');
                            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                          }}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => {
                            const [year, month] = label.split('-');
                            return formatMonthYear(new Date(parseInt(year), parseInt(month) - 1));
                          }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} name="Revenue" />
                        <Area type="monotone" dataKey="totalExpenses" stackId="2" stroke="#FF8042" fill="#FF8042" fillOpacity={0.6} name="Total Expenses" />
                        <Area type="monotone" dataKey="netProfit" stackId="3" stroke="#00C49F" fill="#00C49F" fillOpacity={0.8} name="Net Profit" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet Tab */}
          <TabsContent value="balance-sheet" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>
                  Assets, liabilities, and equity for {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Assets Section */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-3 font-semibold">ASSETS</div>
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-semibold">Item</th>
                          {combinedData.map((d) => {
                            const [year, month] = d.month.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1);
                            return (
                              <th key={d.month} className="text-right p-3 font-semibold">
                                {formatMonthYear(date)}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Current Assets</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3">
                              {formatCurrency(d.currentAssets)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Fixed Assets</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3">
                              {formatCurrency(d.fixedAssets)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t-2">
                          <td className="p-3 font-semibold">Total Assets</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 font-semibold">
                              {formatCurrency(d.totalAssets)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Liabilities & Equity Section */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-3 font-semibold">LIABILITIES & EQUITY</div>
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-semibold">Item</th>
                          {combinedData.map((d) => {
                            const [year, month] = d.month.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1);
                            return (
                              <th key={d.month} className="text-right p-3 font-semibold">
                                {formatMonthYear(date)}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Current Liabilities</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3">
                              {formatCurrency(d.currentLiabilities)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Long-Term Debt</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3">
                              {formatCurrency(d.longTermDebt)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t-2">
                          <td className="p-3 font-semibold">Total Liabilities</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 font-semibold">
                              {formatCurrency(d.totalLiabilities)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Share Capital</td>
                          {combinedData.map((d) => {
                            const bs = filteredBalanceSheet.find(b => b.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3">
                                {formatCurrency(bs?.shareCapital || 0)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="p-3 pl-6 text-muted-foreground">Retained Earnings</td>
                          {combinedData.map((d) => {
                            const bs = filteredBalanceSheet.find(b => b.month === d.month);
                            return (
                              <td key={d.month} className="text-right p-3">
                                {formatCurrency(bs?.retainedEarnings || 0)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-t-2 border-primary bg-primary/5">
                          <td className="p-3 font-bold text-lg">Total Equity</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 font-bold text-lg">
                              {formatCurrency(d.totalEquity)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t-2">
                          <td className="p-3 font-semibold">Total Liabilities & Equity</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 font-semibold">
                              {formatCurrency(d.totalLiabilities + d.totalEquity)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Chart */}
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={combinedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tickFormatter={(value) => {
                            const [year, month] = value.split('-');
                            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                          }}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => {
                            const [year, month] = label.split('-');
                            return formatMonthYear(new Date(parseInt(year), parseInt(month) - 1));
                          }}
                        />
                        <Legend />
                        <Bar dataKey="totalAssets" fill="#0088FE" name="Total Assets" />
                        <Bar dataKey="totalLiabilities" fill="#FF8042" name="Total Liabilities" />
                        <Bar dataKey="totalEquity" fill="#00C49F" name="Total Equity" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cash-flow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Statement</CardTitle>
                <CardDescription>
                  Cash inflows, outflows, and balance for {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Cash Flow Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-semibold">Item</th>
                          {combinedData.map((d) => {
                            const [year, month] = d.month.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1);
                            return (
                              <th key={d.month} className="text-right p-3 font-semibold">
                                {formatMonthYear(date)}
                              </th>
                            );
                          })}
                          <th className="text-right p-3 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="p-3 font-medium">Opening Balance</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3">
                              {formatCurrency(d.openingBalance)}
                            </td>
                          ))}
                          <td className="text-right p-3 text-muted-foreground">—</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium text-green-600">Cash Inflows</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 text-green-600">
                              {formatCurrency(d.cashInflows)}
                            </td>
                          ))}
                          <td className="text-right p-3 font-semibold text-green-600">
                            {formatCurrency(combinedData.reduce((sum, d) => sum + d.cashInflows, 0))}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium text-red-600">Cash Outflows</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 text-red-600">
                              {formatCurrency(d.cashOutflows)}
                            </td>
                          ))}
                          <td className="text-right p-3 font-semibold text-red-600">
                            {formatCurrency(combinedData.reduce((sum, d) => sum + d.cashOutflows, 0))}
                          </td>
                        </tr>
                        <tr className="border-t-2">
                          <td className="p-3 font-semibold">Net Cash Flow</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className={`text-right p-3 font-semibold ${d.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(d.netCashFlow)}
                            </td>
                          ))}
                          <td className="text-right p-3 font-semibold">
                            {formatCurrency(combinedData.reduce((sum, d) => sum + d.netCashFlow, 0))}
                          </td>
                        </tr>
                        <tr className="border-t-2 border-primary bg-primary/5">
                          <td className="p-3 font-bold text-lg">Closing Balance</td>
                          {combinedData.map((d) => (
                            <td key={d.month} className="text-right p-3 font-bold text-lg">
                              {formatCurrency(d.closingBalance)}
                            </td>
                          ))}
                          <td className="text-right p-3 font-bold text-lg">
                            {formatCurrency(combinedData[combinedData.length - 1]?.closingBalance || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Chart */}
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={combinedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tickFormatter={(value) => {
                            const [year, month] = value.split('-');
                            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                          }}
                        />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => {
                            const [year, month] = label.split('-');
                            return formatMonthYear(new Date(parseInt(year), parseInt(month) - 1));
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="cashInflows" fill="#00C49F" name="Cash Inflows" />
                        <Bar yAxisId="left" dataKey="cashOutflows" fill="#FF8042" name="Cash Outflows" />
                        <Line yAxisId="right" type="monotone" dataKey="closingBalance" stroke="#0088FE" strokeWidth={3} name="Closing Balance" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends & Analysis Tab */}
          <TabsContent value="trends" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue & Profit Trends</CardTitle>
                  <CardDescription>
                    Performance over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => {
                          const [year, month] = value.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => {
                          const [year, month] = label.split('-');
                          return formatMonthYear(new Date(parseInt(year), parseInt(month) - 1));
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#0088FE" strokeWidth={2} name="Revenue" />
                      <Line type="monotone" dataKey="netProfit" stroke="#00C49F" strokeWidth={2} name="Net Profit" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Position Trends</CardTitle>
                  <CardDescription>
                    Assets, liabilities, and equity evolution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => {
                          const [year, month] = value.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => {
                          const [year, month] = label.split('-');
                          return formatMonthYear(new Date(parseInt(year), parseInt(month) - 1));
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="totalAssets" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} name="Total Assets" />
                      <Area type="monotone" dataKey="totalEquity" stackId="2" stroke="#00C49F" fill="#00C49F" fillOpacity={0.6} name="Total Equity" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Liquidity Analysis</CardTitle>
                  <CardDescription>
                    Cash balance and working capital needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => {
                          const [year, month] = value.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => {
                          const [year, month] = label.split('-');
                          return formatMonthYear(new Date(parseInt(year), parseInt(month) - 1));
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="closingBalance" stroke="#0088FE" strokeWidth={2} name="Cash Balance" />
                      <Line type="monotone" dataKey="workingCapitalNeed" stroke="#FF8042" strokeWidth={2} name="Working Capital Need" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Profitability Margins</CardTitle>
                  <CardDescription>
                    Gross, operating, and net profit margins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={combinedData.map(d => {
                      const pl = filteredProfitLoss.find(p => p.month === d.month);
                      const revenue = d.revenue || 1;
                      return {
                        month: d.month,
                        grossMargin: pl ? ((pl.grossProfit / revenue) * 100) : 0,
                        operatingMargin: pl ? ((pl.operatingProfit / revenue) * 100) : 0,
                        netMargin: pl ? ((pl.netProfit / revenue) * 100) : 0,
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => {
                          const [year, month] = value.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                        labelFormatter={(label) => {
                          const [year, month] = label.split('-');
                          return formatMonthYear(new Date(parseInt(year), parseInt(month) - 1));
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="grossMargin" stroke="#0088FE" strokeWidth={2} name="Gross Margin %" />
                      <Line type="monotone" dataKey="operatingMargin" stroke="#00C49F" strokeWidth={2} name="Operating Margin %" />
                      <Line type="monotone" dataKey="netMargin" stroke="#FF8042" strokeWidth={2} name="Net Margin %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
