"use client";

import { useMemo } from "react";
import { useYear } from "@/contexts/year-context";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useProfitLoss, useDeleteProfitLoss } from "@kit/hooks";
import type { ProfitAndLoss } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import AppLayout from "@/components/app-layout";
import { formatCurrency } from "@kit/lib/config";
import { toast } from "sonner";
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
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent, Target, BarChart3 } from "lucide-react";

export default function ProfitLossContent() {
  const router = useRouter();
  const { selectedYear } = useYear();
  const profitLossQuery = useProfitLoss();
  const { data: profitLoss, isLoading, error, isError, dataUpdatedAt } = profitLossQuery;
  const deleteMutation = useDeleteProfitLoss();

  // Filter and sort profit loss data
  const filteredProfitLoss = useMemo(() => {
    if (!profitLoss) {
      return [];
    }
    
    const filtered = profitLoss
      .filter(pl => {
        const matches = pl.month.startsWith(selectedYear);
        return matches;
      })
      .sort((a, b) => a.month.localeCompare(b.month));
    
    return filtered;
  }, [profitLoss, selectedYear]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!filteredProfitLoss.length) return null;
    
    const totalRevenue = filteredProfitLoss.reduce((sum, pl) => sum + pl.totalRevenue, 0);
    const totalExpenses = filteredProfitLoss.reduce((sum, pl) => 
      sum + pl.costOfGoodsSold + pl.operatingExpenses + pl.personnelCosts + pl.leasingCosts + pl.depreciation + pl.interestExpense + pl.taxes + pl.otherExpenses, 0);
    const totalNetProfit = filteredProfitLoss.reduce((sum, pl) => sum + pl.netProfit, 0);
    const totalGrossProfit = filteredProfitLoss.reduce((sum, pl) => sum + pl.grossProfit, 0);
    const avgRevenue = totalRevenue / filteredProfitLoss.length;
    const avgNetProfit = totalNetProfit / filteredProfitLoss.length;
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    const grossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    
    return {
      totalRevenue,
      totalExpenses,
      totalNetProfit,
      totalGrossProfit,
      avgRevenue,
      avgNetProfit,
      profitMargin,
      grossMargin,
    };
  }, [filteredProfitLoss]);

  const columns: ColumnDef<ProfitAndLoss>[] = useMemo(() => [
    {
      accessorKey: "month",
      header: "Month",
      cell: ({ row }) => {
        const month = row.original.month;
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      },
    },
    {
      accessorKey: "totalRevenue",
      header: "Total Revenue",
      cell: ({ row }) => formatCurrency(row.original.totalRevenue),
    },
    {
      accessorKey: "costOfGoodsSold",
      header: "COGS",
      cell: ({ row }) => formatCurrency(row.original.costOfGoodsSold),
    },
    {
      accessorKey: "grossProfit",
      header: "Gross Profit",
      cell: ({ row }) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(row.original.grossProfit)}
        </span>
      ),
    },
    {
      accessorKey: "operatingExpenses",
      header: "Operating Expenses",
      cell: ({ row }) => formatCurrency(row.original.operatingExpenses),
    },
    {
      accessorKey: "personnelCosts",
      header: "Personnel Costs",
      cell: ({ row }) => formatCurrency(row.original.personnelCosts),
    },
    {
      accessorKey: "netProfit",
      header: "Net Profit",
      cell: ({ row }) => {
        const profit = row.original.netProfit;
        return (
          <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit)}
          </span>
        );
      },
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this profit & loss statement?")) return;
    
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Profit & Loss statement deleted successfully");
    } catch (error) {
      toast.error("Failed to delete profit & loss statement");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} profit & loss statement(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
      toast.success(`${ids.length} profit & loss statement(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete profit & loss statements");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: ProfitAndLoss[], type: 'selected' | 'all') => {
    const statementsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Total Revenue', 'COGS', 'Gross Profit', 'Operating Expenses', 'Personnel Costs', 'Leasing Costs', 'Depreciation', 'Interest Expense', 'Taxes', 'Other Expenses', 'Operating Profit', 'Net Profit'].join(','),
      ...statementsToCopy.map(pl => [
        pl.month,
        pl.totalRevenue,
        pl.costOfGoodsSold,
        pl.grossProfit,
        pl.operatingExpenses,
        pl.personnelCosts,
        pl.leasingCosts,
        pl.depreciation,
        pl.interestExpense,
        pl.taxes,
        pl.otherExpenses,
        pl.operatingProfit,
        pl.netProfit,
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${statementsToCopy.length} profit & loss statement(s) copied to clipboard`);
  };

  const handleBulkExport = (data: ProfitAndLoss[], type: 'selected' | 'all') => {
    const statementsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Total Revenue', 'COGS', 'Gross Profit', 'Operating Expenses', 'Personnel Costs', 'Leasing Costs', 'Depreciation', 'Interest Expense', 'Taxes', 'Other Expenses', 'Operating Profit', 'Net Profit'].join(','),
      ...statementsToExport.map(pl => [
        pl.month,
        pl.totalRevenue,
        pl.costOfGoodsSold,
        pl.grossProfit,
        pl.operatingExpenses,
        pl.personnelCosts,
        pl.leasingCosts,
        pl.depreciation,
        pl.interestExpense,
        pl.taxes,
        pl.otherExpenses,
        pl.operatingProfit,
        pl.netProfit,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${statementsToExport.length} profit & loss statement(s) exported`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-muted-foreground mt-2">
            Analyze your profitability and financial performance
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(summary.avgRevenue)}/month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              {summary.totalNetProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalNetProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                Margin: {summary.profitMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalGrossProfit)}</div>
              <p className="text-xs text-muted-foreground">
                Margin: {summary.grossMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalRevenue > 0 ? ((summary.totalExpenses / summary.totalRevenue) * 100).toFixed(1) : 0}% of revenue
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
                <CardDescription>Monthly revenue and total expenses comparison</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : filteredProfitLoss.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredProfitLoss}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="totalRevenue" fill="#22c55e" name="Revenue" />
                      <Bar dataKey="operatingExpenses" fill="#ef4444" name="Operating Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profit Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Trends</CardTitle>
                <CardDescription>Gross profit and net profit over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : filteredProfitLoss.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={filteredProfitLoss}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="grossProfit" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        name="Gross Profit"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="netProfit" 
                        stroke={filteredProfitLoss[0]?.netProfit >= 0 ? "#8884d8" : "#ef4444"}
                        strokeWidth={2}
                        name="Net Profit"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Monthly expense components</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : filteredProfitLoss.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={filteredProfitLoss}>
                    <defs>
                      <linearGradient id="colorCOGS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOperating" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPersonnel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="costOfGoodsSold" 
                      stackId="1"
                      stroke="#ef4444" 
                      fill="url(#colorCOGS)" 
                      name="COGS"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="operatingExpenses" 
                      stackId="1"
                      stroke="#f97316" 
                      fill="url(#colorOperating)" 
                      name="Operating"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="personnelCosts" 
                      stackId="1"
                      stroke="#eab308" 
                      fill="url(#colorPersonnel)" 
                      name="Personnel"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profitability Trend</CardTitle>
              <CardDescription>Revenue, expenses, and profit evolution over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : filteredProfitLoss.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={filteredProfitLoss}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="totalRevenue" 
                      stroke="#22c55e" 
                      fill="#22c55e"
                      fillOpacity={0.6}
                      name="Revenue"
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="operatingExpenses" 
                      stroke="#ef4444" 
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Expenses"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="netProfit" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      name="Net Profit"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profit Margins */}
          <Card>
            <CardHeader>
              <CardTitle>Profit Margins</CardTitle>
              <CardDescription>Gross and net profit margins over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : filteredProfitLoss.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredProfitLoss.map(pl => ({
                    ...pl,
                    grossMargin: pl.totalRevenue > 0 ? (pl.grossProfit / pl.totalRevenue) * 100 : 0,
                    netMargin: pl.totalRevenue > 0 ? (pl.netProfit / pl.totalRevenue) * 100 : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="grossMargin" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Gross Margin %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netMargin" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Net Margin %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Components</CardTitle>
              <CardDescription>Detailed breakdown of all expense categories</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : filteredProfitLoss.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={filteredProfitLoss}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="costOfGoodsSold" stackId="a" fill="#ef4444" name="COGS" />
                    <Bar dataKey="operatingExpenses" stackId="a" fill="#f97316" name="Operating" />
                    <Bar dataKey="personnelCosts" stackId="a" fill="#eab308" name="Personnel" />
                    <Bar dataKey="leasingCosts" stackId="a" fill="#a855f7" name="Leasing" />
                    <Bar dataKey="depreciation" stackId="a" fill="#06b6d4" name="Depreciation" />
                    <Bar dataKey="interestExpense" stackId="a" fill="#ec4899" name="Interest" />
                    <Bar dataKey="taxes" stackId="a" fill="#6366f1" name="Taxes" />
                    <Bar dataKey="otherExpenses" stackId="a" fill="#8b5cf6" name="Other" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <div className="-mx-4">
            <DataTablePage
              title=""
              description=""
              data={filteredProfitLoss || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(pl) => router.push(`/profit-loss/${pl.month}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            sortColumns={[
              { value: "month", label: "Month", type: "character varying" },
              { value: "netProfit", label: "Net Profit", type: "numeric" },
            ]}
            localStoragePrefix="profit-loss"
            searchFields={[]}
          />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}

