"use client";

import { useMemo } from "react";
import { useYear } from "@/contexts/year-context";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useBalanceSheet, useDeleteBalanceSheet } from "@kit/hooks";
import type { BalanceSheet } from "@kit/types";
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
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Building2, Scale, Wallet, Landmark } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function BalanceSheetPage() {
  const router = useRouter();
  const { selectedYear } = useYear();
  const { data: balanceSheets, isLoading } = useBalanceSheet();
  const deleteMutation = useDeleteBalanceSheet();

  // Filter and sort balance sheet data
  const filteredBalanceSheets = useMemo(() => {
    if (!balanceSheets) return [];
    return balanceSheets
      .filter(bs => bs.month.startsWith(selectedYear))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [balanceSheets, selectedYear]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!filteredBalanceSheets.length) return null;
    
    const latest = filteredBalanceSheets[filteredBalanceSheets.length - 1];
    const first = filteredBalanceSheets[0];
    
    return {
      totalAssets: latest.totalAssets,
      totalLiabilities: latest.totalLiabilities,
      totalEquity: latest.totalEquity,
      assetsChange: latest.totalAssets - first.totalAssets,
      liabilitiesChange: latest.totalLiabilities - first.totalLiabilities,
      equityChange: latest.totalEquity - first.totalEquity,
      debtToEquity: latest.totalEquity > 0 ? (latest.totalLiabilities / latest.totalEquity) : 0,
      currentRatio: latest.currentLiabilities > 0 ? (latest.currentAssets / latest.currentLiabilities) : 0,
    };
  }, [filteredBalanceSheets]);

  const columns: ColumnDef<BalanceSheet>[] = useMemo(() => [
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
      accessorKey: "totalAssets",
      header: "Total Assets",
      cell: ({ row }) => formatCurrency(row.original.totalAssets),
    },
    {
      accessorKey: "currentAssets",
      header: "Current Assets",
      cell: ({ row }) => formatCurrency(row.original.currentAssets),
    },
    {
      accessorKey: "fixedAssets",
      header: "Fixed Assets",
      cell: ({ row }) => formatCurrency(row.original.fixedAssets),
    },
    {
      accessorKey: "totalLiabilities",
      header: "Total Liabilities",
      cell: ({ row }) => formatCurrency(row.original.totalLiabilities),
    },
    {
      accessorKey: "currentLiabilities",
      header: "Current Liabilities",
      cell: ({ row }) => formatCurrency(row.original.currentLiabilities),
    },
    {
      accessorKey: "longTermDebt",
      header: "Long-term Debt",
      cell: ({ row }) => formatCurrency(row.original.longTermDebt),
    },
    {
      accessorKey: "totalEquity",
      header: "Total Equity",
      cell: ({ row }) => (
        <span className="font-semibold text-primary">
          {formatCurrency(row.original.totalEquity)}
        </span>
      ),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this balance sheet?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Balance sheet deleted successfully");
    } catch (error) {
      toast.error("Failed to delete balance sheet");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} balance sheet(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} balance sheet(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete balance sheets");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: BalanceSheet[], type: 'selected' | 'all') => {
    const sheetsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Current Assets', 'Fixed Assets', 'Intangible Assets', 'Total Assets', 'Current Liabilities', 'Long-term Debt', 'Total Liabilities', 'Share Capital', 'Retained Earnings', 'Total Equity'].join(','),
      ...sheetsToCopy.map(bs => [
        bs.month,
        bs.currentAssets,
        bs.fixedAssets,
        bs.intangibleAssets,
        bs.totalAssets,
        bs.currentLiabilities,
        bs.longTermDebt,
        bs.totalLiabilities,
        bs.shareCapital,
        bs.retainedEarnings,
        bs.totalEquity,
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${sheetsToCopy.length} balance sheet(s) copied to clipboard`);
  };

  const handleBulkExport = (data: BalanceSheet[], type: 'selected' | 'all') => {
    const sheetsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Current Assets', 'Fixed Assets', 'Intangible Assets', 'Total Assets', 'Current Liabilities', 'Long-term Debt', 'Total Liabilities', 'Share Capital', 'Retained Earnings', 'Total Equity'].join(','),
      ...sheetsToExport.map(bs => [
        bs.month,
        bs.currentAssets,
        bs.fixedAssets,
        bs.intangibleAssets,
        bs.totalAssets,
        bs.currentLiabilities,
        bs.longTermDebt,
        bs.totalLiabilities,
        bs.shareCapital,
        bs.retainedEarnings,
        bs.totalEquity,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${sheetsToExport.length} balance sheet(s) exported`);
  };

  // Latest balance sheet for pie charts
  const latestBalanceSheet = filteredBalanceSheets[filteredBalanceSheets.length - 1];

  return (
    <AppLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Balance Sheet</h1>
          <p className="text-muted-foreground mt-2">
            Track your assets, liabilities, and equity position
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalAssets)}</div>
              <p className={`text-xs ${summary.assetsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.assetsChange >= 0 ? '+' : ''}{formatCurrency(summary.assetsChange)} change
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalLiabilities)}</div>
              <p className={`text-xs ${summary.liabilitiesChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.liabilitiesChange >= 0 ? '+' : ''}{formatCurrency(summary.liabilitiesChange)} change
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalEquity)}</div>
              <p className={`text-xs ${summary.equityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.equityChange >= 0 ? '+' : ''}{formatCurrency(summary.equityChange)} change
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Ratio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.currentRatio.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.currentRatio >= 1 ? 'Healthy' : 'Below 1.0'}
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
          <TabsTrigger value="composition">Composition</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Assets Breakdown */}
            {latestBalanceSheet && (
              <Card>
                <CardHeader>
                  <CardTitle>Assets Composition</CardTitle>
                  <CardDescription>Current vs Fixed vs Intangible Assets</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Current', value: latestBalanceSheet.currentAssets },
                          { name: 'Fixed', value: latestBalanceSheet.fixedAssets },
                          { name: 'Intangible', value: latestBalanceSheet.intangibleAssets },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[latestBalanceSheet.currentAssets, latestBalanceSheet.fixedAssets, latestBalanceSheet.intangibleAssets].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Liabilities & Equity */}
            {latestBalanceSheet && (
              <Card>
                <CardHeader>
                  <CardTitle>Liabilities & Equity</CardTitle>
                  <CardDescription>Financial structure breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Current Liabilities', value: latestBalanceSheet.currentLiabilities },
                          { name: 'Long-term Debt', value: latestBalanceSheet.longTermDebt },
                          { name: 'Equity', value: latestBalanceSheet.totalEquity },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[latestBalanceSheet.currentLiabilities, latestBalanceSheet.longTermDebt, latestBalanceSheet.totalEquity].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Balance Sheet Equation */}
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet Equation</CardTitle>
              <CardDescription>Assets = Liabilities + Equity over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : filteredBalanceSheets.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredBalanceSheets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="totalAssets" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      name="Total Assets"
                    />
                    <Line 
                      type="monotone" 
                      dataKey={(d: BalanceSheet) => d.totalLiabilities + d.totalEquity}
                      stroke="#8884d8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Liabilities + Equity"
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
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assets Trend</CardTitle>
              <CardDescription>Evolution of assets over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : filteredBalanceSheets.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={filteredBalanceSheets}>
                    <defs>
                      <linearGradient id="colorCurrentAssets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFixedAssets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="currentAssets" 
                      stackId="1"
                      stroke="#22c55e" 
                      fill="url(#colorCurrentAssets)" 
                      name="Current Assets"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="fixedAssets" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="url(#colorFixedAssets)" 
                      name="Fixed Assets"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="intangibleAssets" 
                      stackId="1"
                      stroke="#a855f7" 
                      fill="#a855f7"
                      fillOpacity={0.6}
                      name="Intangible Assets"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Liabilities & Equity Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Liabilities & Equity Trend</CardTitle>
              <CardDescription>Evolution of liabilities and equity</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : filteredBalanceSheets.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={filteredBalanceSheets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="currentLiabilities" fill="#ef4444" name="Current Liabilities" />
                    <Bar dataKey="longTermDebt" fill="#f97316" name="Long-term Debt" />
                    <Line 
                      type="monotone" 
                      dataKey="totalEquity" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      name="Total Equity"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="composition" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Assets Composition Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Assets Composition</CardTitle>
                <CardDescription>Asset breakdown by type over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : filteredBalanceSheets.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredBalanceSheets}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="currentAssets" stackId="a" fill="#22c55e" name="Current" />
                      <Bar dataKey="fixedAssets" stackId="a" fill="#3b82f6" name="Fixed" />
                      <Bar dataKey="intangibleAssets" stackId="a" fill="#a855f7" name="Intangible" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Liabilities Composition */}
            <Card>
              <CardHeader>
                <CardTitle>Liabilities Composition</CardTitle>
                <CardDescription>Current vs long-term liabilities</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : filteredBalanceSheets.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredBalanceSheets}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="currentLiabilities" fill="#ef4444" name="Current Liabilities" />
                      <Bar dataKey="longTermDebt" fill="#f97316" name="Long-term Debt" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <div className="-mx-4">
            <DataTablePage
              title=""
              description=""
              data={balanceSheets || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(bs) => router.push(`/balance-sheet/${bs.month}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            sortColumns={[
              { value: "month", label: "Month", type: "character varying" },
              { value: "totalAssets", label: "Total Assets", type: "numeric" },
            ]}
            localStoragePrefix="balance-sheet"
            searchFields={[]}
          />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}

