"use client";

import { useMemo, useState } from "react";
import { useTranslations } from 'next-intl';
import { useYear } from "@/contexts/year-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { Button } from "@kit/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import AppLayout from "@/components/app-layout";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { 
  useIncomeStatement,
  useBalanceSheet,
  useCashFlow
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
  ComposedChart
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  DollarSign, 
  Building2, 
  Wallet, 
  BarChart3,
  FileText
} from "lucide-react";
import type { ExpenseCategory, SalesType } from "@kit/types";

interface IncomeStatementRow {
  account: string;
  accountCode?: string;
  amount: number;
  level: number; // 0 = main, 1 = sub, 2 = sub-sub
  isTotal?: boolean;
  isSectionHeader?: boolean;
}

export default function FinancialStatementContent() {
  const t = useTranslations('financialStatement');
  const tCommon = useTranslations('common');
  const { selectedYear } = useYear();
  const [selectedPeriod, setSelectedPeriod] = useState<'year' | 'quarter' | 'month'>('year');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('summary');

  // Build API params
  const apiParams = useMemo(() => {
    if (selectedPeriod === 'month' && selectedMonth) {
      return { month: selectedMonth };
    } else if (selectedPeriod === 'quarter' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const quarterNum = Math.floor((parseInt(month) - 1) / 3) + 1;
      return { year, quarter: `Q${quarterNum}` };
    } else {
      return { year: selectedYear };
    }
  }, [selectedYear, selectedPeriod, selectedMonth]);

  // Fetch income statement data from API
  const { data: incomeStatementData, isLoading } = useIncomeStatement(apiParams);
  const { data: balanceSheetData, isLoading: bsLoading } = useBalanceSheet();
  const { data: cashFlowData, isLoading: cfLoading } = useCashFlow();

  const isLoadingData = isLoading || bsLoading || cfLoading;

  // Sales type labels - using translations
  const salesTypeLabels: Record<SalesType, string> = {
    on_site: tCommon('sales.onSite'),
    delivery: tCommon('sales.delivery'),
    takeaway: tCommon('sales.takeaway'),
    catering: tCommon('sales.catering'),
    other: tCommon('sales.other')
  };

  // Category labels mapping - using translations
  const categoryLabels: Record<ExpenseCategory | string, string> = {
    rent: tCommon('expenses.categories.rent'),
    utilities: tCommon('expenses.categories.utilities'),
    supplies: tCommon('expenses.categories.supplies'),
    marketing: tCommon('expenses.categories.marketing'),
    insurance: tCommon('expenses.categories.insurance'),
    maintenance: tCommon('expenses.categories.maintenance'),
    professional_services: tCommon('expenses.categories.professionalServices'),
    other: tCommon('expenses.categories.other')
  };

  // Build income statement from actual API data
  const incomeStatement = useMemo(() => {
    if (!incomeStatementData) return [];
    
    const rows: IncomeStatementRow[] = [];
    
    // Operating Income
    rows.push({
      account: t('sections.operatingIncome'),
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    // Sales by type (only show types that have data)
    Object.entries(incomeStatementData.sales.byType).forEach(([type, data]) => {
      if (data.total > 0) {
        rows.push({
          account: salesTypeLabels[type as SalesType] || type,
          accountCode: "706000",
          amount: data.total,
          level: 1
        });
        
        // Add individual sales items in detailed view
        if (viewMode === 'detailed' && data.items.length > 0) {
          data.items.forEach(item => {
            rows.push({
              account: item.description || `${t('sections.sales')} ${formatDate(item.date)}`,
              amount: item.amount,
              level: 2
            });
          });
        }
      }
    });

    // Total Sales
    rows.push({
      account: t('totals.totalOperatingIncome'),
      amount: incomeStatementData.totalRevenue,
      level: 0,
      isTotal: true
    });

    // Cost of Goods Sold (only if > 0)
    if (incomeStatementData.costOfGoodsSold > 0) {
      rows.push({
        account: t('sections.costOfGoodsSold'),
        level: 0,
        amount: 0,
        isSectionHeader: true
      });

      rows.push({
        account: t('totals.totalCostOfGoodsSold'),
        amount: incomeStatementData.costOfGoodsSold,
        level: 0,
        isTotal: true
      });
    }

    // Gross Profit
    rows.push({
      account: t('sections.grossProfit'),
      amount: incomeStatementData.grossProfit,
      level: 0,
      isTotal: true
    });

    // Operating Expenses
    rows.push({
      account: t('sections.operatingExpenses'),
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    // Expenses by category (only show categories that have data)
    Object.entries(incomeStatementData.expenses.byCategory).forEach(([category, data]) => {
      // Skip supplies as they're in COGS
      if (category !== 'supplies' && data.total > 0) {
        rows.push({
          account: categoryLabels[category] || category,
          amount: data.total,
          level: 1
        });
        
        // Add individual expense items in detailed view
        if (viewMode === 'detailed' && data.items.length > 0) {
          data.items.forEach(item => {
            rows.push({
              account: item.name || item.description || `${t('sections.operatingExpenses')} ${formatDate(item.date)}`,
              amount: item.amount,
              level: 2
            });
          });
        }
      }
    });

    // Personnel Costs (only if > 0)
    if (incomeStatementData.personnel.totalCost > 0) {
      rows.push({
        account: t('sections.personnelCosts'),
        amount: incomeStatementData.personnel.totalCost,
        level: 1
      });
      
      // Show breakdown in detailed view
      if (viewMode === 'detailed' && incomeStatementData.personnel.items.length > 0) {
        incomeStatementData.personnel.items.forEach(item => {
          rows.push({
            account: `${item.name} - ${tCommon('salary')}: ${formatCurrency(item.salary)} + ${tCommon('charges')}: ${formatCurrency(item.charges)}`,
            amount: item.total,
            level: 2
          });
        });
      }
    }

    // Leasing Costs (only if > 0)
    if (incomeStatementData.leasing.total > 0) {
      rows.push({
        account: t('sections.leasingCosts'),
        amount: incomeStatementData.leasing.total,
        level: 1
      });
      
      // Show individual leasing items in detailed view
      if (viewMode === 'detailed' && incomeStatementData.leasing.items.length > 0) {
        incomeStatementData.leasing.items.forEach(item => {
          rows.push({
            account: item.name,
            amount: item.amount,
            level: 2
          });
        });
      }
    }

    // Depreciation (only if > 0)
    if (incomeStatementData.depreciation.total > 0) {
      rows.push({
        account: t('sections.depreciation'),
        amount: incomeStatementData.depreciation.total,
        level: 1
      });
      
      // Show individual depreciation items in detailed view
      if (viewMode === 'detailed' && incomeStatementData.depreciation.items.length > 0) {
        incomeStatementData.depreciation.items.forEach(item => {
          rows.push({
            account: `${item.investmentName}`,
            amount: item.amount,
            level: 2
          });
        });
      }
    }

    // Interest Expense (only if > 0)
    if (incomeStatementData.interest.total > 0) {
      rows.push({
        account: t('sections.interestExpense'),
        amount: incomeStatementData.interest.total,
        level: 1
      });
      
      // Show individual interest items in detailed view
      if (viewMode === 'detailed' && incomeStatementData.interest.items.length > 0) {
        incomeStatementData.interest.items.forEach(item => {
          rows.push({
            account: `${item.loanName} - ${formatDate(item.date)}`,
            amount: item.amount,
            level: 2
          });
        });
      }
    }

    // Taxes (only if > 0)
    if (incomeStatementData.taxes.total > 0) {
      rows.push({
        account: t('sections.taxes'),
        amount: incomeStatementData.taxes.total,
        level: 1
      });
      
      // Show individual tax items in detailed view
      if (viewMode === 'detailed' && incomeStatementData.taxes.items.length > 0) {
        incomeStatementData.taxes.items.forEach(item => {
          rows.push({
            account: item.name,
            amount: item.amount,
            level: 2
          });
        });
      }
    }

    // Total Operating Expenses
    rows.push({
      account: t('totals.totalOperatingExpenses'),
      amount: incomeStatementData.totalOperatingExpenses,
      level: 0,
      isTotal: true
    });

    // Operating Profit
    rows.push({
      account: t('sections.operatingProfit'),
      amount: incomeStatementData.operatingProfit,
      level: 0,
      isTotal: true
    });

    // Non-operating Income (always show, even if 0)
    rows.push({
      account: t('sections.nonOperatingIncome'),
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    rows.push({
      account: t('totals.totalNonOperatingIncome'),
      amount: 0,
      level: 0,
      isTotal: true
    });

    // Non-operating Expenses (always show, even if 0)
    rows.push({
      account: t('sections.nonOperatingExpenses'),
      level: 0,
      amount: 0,
      isSectionHeader: true
    });

    rows.push({
      account: t('totals.totalNonOperatingExpenses'),
      amount: 0,
      level: 0,
      isTotal: true
    });

    // Net Profit/Loss
    rows.push({
      account: t('sections.netProfit'),
      amount: incomeStatementData.netProfit,
      level: 0,
      isTotal: true
    });

    return rows;
  }, [incomeStatementData, viewMode, t, tCommon, salesTypeLabels, categoryLabels]);

  // Combined data for comprehensive view
  const combinedData = useMemo(() => {
    if (!balanceSheetData || !cashFlowData) return [];
    
    const months = new Set<string>();
    balanceSheetData.forEach(bs => months.add(bs.month));
    cashFlowData.forEach(cf => months.add(cf.month));

    return Array.from(months)
      .sort()
      .map(month => {
        const bs = balanceSheetData.find(b => b.month === month);
        const cf = cashFlowData.find(c => c.month === month);

        return {
          month,
          totalAssets: bs?.totalAssets || 0,
          closingBalance: cf?.closingBalance || 0,
        };
      });
  }, [balanceSheetData, cashFlowData]);

  // Summary statistics
  const summary = useMemo(() => {
    if (!incomeStatementData) return null;

    return {
      totalRevenue: incomeStatementData.totalRevenue,
      totalProfit: incomeStatementData.netProfit,
      latestAssets: combinedData.length > 0 ? combinedData[combinedData.length - 1]?.totalAssets || 0 : 0,
      avgCashBalance: combinedData.length > 0 
        ? combinedData.reduce((sum, d) => sum + d.closingBalance, 0) / combinedData.length 
        : 0,
      profitMargin: incomeStatementData.totalRevenue > 0 
        ? (incomeStatementData.netProfit / incomeStatementData.totalRevenue) * 100 
        : 0,
    };
  }, [incomeStatementData, combinedData]);

  // Get date range for display
  const dateRange = useMemo(() => {
    if (selectedPeriod === 'year') {
      return `${tCommon('date.from')} 01/01/${selectedYear} ${tCommon('date.to')} 31/12/${selectedYear}`;
    } else if (selectedPeriod === 'quarter' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const quarterStart = Math.floor((parseInt(month) - 1) / 3) * 3 + 1;
      const quarterEnd = quarterStart + 2;
      const startDate = new Date(parseInt(year), quarterStart - 1, 1);
      const endDate = new Date(parseInt(year), quarterEnd, 0);
      return `${tCommon('date.from')} ${formatDate(startDate.toISOString())} ${tCommon('date.to')} ${formatDate(endDate.toISOString())}`;
    } else if (selectedPeriod === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      return `${tCommon('date.from')} ${formatDate(startDate.toISOString())} ${tCommon('date.to')} ${formatDate(endDate.toISOString())}`;
    }
    return `${tCommon('date.from')} 01/01/${selectedYear} ${tCommon('date.to')} 31/12/${selectedYear}`;
  }, [selectedYear, selectedPeriod, selectedMonth, tCommon]);

  // Generate month options
  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      const monthStr = `${selectedYear}-${String(i).padStart(2, '0')}`;
      const date = new Date(parseInt(selectedYear), i - 1, 1);
      months.push({
        value: monthStr,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return months;
  }, [selectedYear]);

  const handleExport = (statement: IncomeStatementRow[]) => {
    const csv = [
      [t('header.account'), t('header.accountCode'), t('header.total')].join(','),
      ...statement.map(row => [
        `"${'  '.repeat(row.level)}${row.account}"`,
        row.accountCode || '',
        row.amount.toFixed(2).replace('.', ',')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-statement-${selectedYear}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderIncomeStatementTable = (statement: IncomeStatementRow[]) => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b-2">
              <tr>
                <th className="text-left p-4 font-semibold">{t('header.account')}</th>
                <th className="text-center p-4 font-semibold">{t('header.accountCode')}</th>
                <th className="text-right p-4 font-semibold">{t('header.total')}</th>
              </tr>
            </thead>
            <tbody>
              {statement.map((row, index) => {
                const indentClass = row.level === 0 ? '' : row.level === 1 ? 'pl-6' : 'pl-12';
                const isBold = row.isTotal || row.isSectionHeader;
                const isSectionHeader = row.isSectionHeader;
                const isNetProfit = row.account === t('sections.netProfit');
                
                return (
                  <tr 
                    key={index}
                    className={`
                      ${isSectionHeader ? 'bg-muted/50 border-t-2' : ''}
                      ${isNetProfit ? 'bg-primary/10 border-t-2 border-primary' : ''}
                      ${row.level > 0 && !isSectionHeader ? 'border-b border-dashed' : ''}
                    `}
                  >
                    <td className={`p-3 ${indentClass} ${isBold ? 'font-semibold' : ''} ${isNetProfit ? 'text-lg' : ''}`}>
                      {row.account}
                    </td>
                    <td className="text-center p-3 text-muted-foreground">
                      {row.accountCode || ''}
                    </td>
                    <td className={`text-right p-3 ${isBold ? 'font-semibold' : ''} ${isNetProfit ? 'text-lg' : ''} ${row.amount < 0 ? 'text-red-600' : ''}`}>
                      {row.amount !== 0 || row.isTotal || row.isSectionHeader ? formatCurrency(row.amount) : '0,00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {t('header.currencyNote')}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoadingData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!incomeStatementData) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('subtitle')}
            </p>
          </div>
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No financial data available for the selected period.
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={(value: 'year' | 'quarter' | 'month') => {
              setSelectedPeriod(value);
              if (value === 'year') {
                setSelectedMonth('');
              }
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">{t('period.year')}</SelectItem>
                <SelectItem value="quarter">{t('period.quarter')}</SelectItem>
                <SelectItem value="month">{t('period.month')}</SelectItem>
              </SelectContent>
            </Select>
            {(selectedPeriod === 'quarter' || selectedPeriod === 'month') && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('period.selectPeriod')} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => handleExport(incomeStatement)} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('export')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="comprehensive" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comprehensive">{t('comprehensiveView')}</TabsTrigger>
            <TabsTrigger value="income-statement">{t('incomeStatement')}</TabsTrigger>
          </TabsList>

          {/* Comprehensive View */}
          <TabsContent value="comprehensive" className="space-y-4">
            {summary && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('summary.totalRevenue')}</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('summary.netProfit')}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalProfit)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.profitMargin.toFixed(1)}% {t('summary.profitMargin')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('summary.totalAssets')}</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.latestAssets)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('summary.avgCashBalance')}</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.avgCashBalance)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('summary.monthlyAverage')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {combinedData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('summary.totalRevenue')} & {t('summary.netProfit')} {tCommon('trends')}</CardTitle>
                  <CardDescription>
                    {tCommon('performance')} {selectedYear}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
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
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="totalAssets" fill="#0088FE" name={t('summary.totalAssets')} />
                      <Line yAxisId="right" type="monotone" dataKey="closingBalance" stroke="#FF8042" strokeWidth={2} name={t('summary.avgCashBalance')} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Income Statement View */}
          <TabsContent value="income-statement" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-center space-y-2 flex-1">
                <h2 className="text-2xl font-bold">{t('header.companyName')}</h2>
                <p className="text-lg font-semibold">{t('header.reportTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('header.accountingBasis')}</p>
                <p className="text-sm font-medium">{dateRange}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === 'summary' ? 'default' : 'outline'}
                  onClick={() => setViewMode('summary')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {t('summaryView')}
                </Button>
                <Button 
                  variant={viewMode === 'detailed' ? 'default' : 'outline'}
                  onClick={() => setViewMode('detailed')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t('detailedView')}
                </Button>
              </div>
            </div>

            {renderIncomeStatementTable(incomeStatement)}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
