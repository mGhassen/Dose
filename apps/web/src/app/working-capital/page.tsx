"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useWorkingCapital, useDeleteWorkingCapital } from "@kit/hooks";
import type { WorkingCapital } from "@kit/types";
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
import { TrendingUp, TrendingDown, DollarSign, Wallet, BarChart3, ArrowUpDown } from "lucide-react";

export default function WorkingCapitalPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const { data: workingCapital, isLoading } = useWorkingCapital();
  const deleteMutation = useDeleteWorkingCapital();

  // Filter and sort working capital data
  const filteredWorkingCapital = useMemo(() => {
    if (!workingCapital) return [];
    return workingCapital
      .filter(wc => wc.month.startsWith(selectedYear))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [workingCapital, selectedYear]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!filteredWorkingCapital.length) return null;
    
    const totalReceivables = filteredWorkingCapital.reduce((sum, wc) => sum + wc.accountsReceivable, 0);
    const totalInventory = filteredWorkingCapital.reduce((sum, wc) => sum + wc.inventory, 0);
    const totalPayables = filteredWorkingCapital.reduce((sum, wc) => sum + wc.accountsPayable, 0);
    const totalBFR = filteredWorkingCapital.reduce((sum, wc) => sum + wc.workingCapitalNeed, 0);
    const avgBFR = totalBFR / filteredWorkingCapital.length;
    const latestBFR = filteredWorkingCapital[filteredWorkingCapital.length - 1]?.workingCapitalNeed || 0;
    const firstBFR = filteredWorkingCapital[0]?.workingCapitalNeed || 0;
    const bfrChange = latestBFR - firstBFR;
    
    return {
      totalReceivables,
      totalInventory,
      totalPayables,
      totalBFR,
      avgBFR,
      latestBFR,
      bfrChange,
      monthCount: filteredWorkingCapital.length,
    };
  }, [filteredWorkingCapital]);

  const columns: ColumnDef<WorkingCapital>[] = useMemo(() => [
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
      accessorKey: "accountsReceivable",
      header: "Accounts Receivable",
      cell: ({ row }) => formatCurrency(row.original.accountsReceivable),
    },
    {
      accessorKey: "inventory",
      header: "Inventory",
      cell: ({ row }) => formatCurrency(row.original.inventory),
    },
    {
      accessorKey: "accountsPayable",
      header: "Accounts Payable",
      cell: ({ row }) => formatCurrency(row.original.accountsPayable),
    },
    {
      accessorKey: "otherCurrentAssets",
      header: "Other Current Assets",
      cell: ({ row }) => formatCurrency(row.original.otherCurrentAssets),
    },
    {
      accessorKey: "otherCurrentLiabilities",
      header: "Other Current Liabilities",
      cell: ({ row }) => formatCurrency(row.original.otherCurrentLiabilities),
    },
    {
      accessorKey: "workingCapitalNeed",
      header: "Working Capital Need (BFR)",
      cell: ({ row }) => {
        const bfr = row.original.workingCapitalNeed;
        return (
          <span className={`font-semibold ${bfr >= 0 ? 'text-primary' : 'text-red-600'}`}>
            {formatCurrency(bfr)}
          </span>
        );
      },
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this working capital entry?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Working capital entry deleted successfully");
    } catch (error) {
      toast.error("Failed to delete working capital entry");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} working capital entry(ies)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} working capital entry(ies) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete working capital entries");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: WorkingCapital[], type: 'selected' | 'all') => {
    const entriesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Accounts Receivable', 'Inventory', 'Accounts Payable', 'Other Current Assets', 'Other Current Liabilities', 'Working Capital Need'].join(','),
      ...entriesToCopy.map(wc => [
        wc.month,
        wc.accountsReceivable,
        wc.inventory,
        wc.accountsPayable,
        wc.otherCurrentAssets,
        wc.otherCurrentLiabilities,
        wc.workingCapitalNeed,
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${entriesToCopy.length} working capital entry(ies) copied to clipboard`);
  };

  const handleBulkExport = (data: WorkingCapital[], type: 'selected' | 'all') => {
    const entriesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Accounts Receivable', 'Inventory', 'Accounts Payable', 'Other Current Assets', 'Other Current Liabilities', 'Working Capital Need'].join(','),
      ...entriesToExport.map(wc => [
        wc.month,
        wc.accountsReceivable,
        wc.inventory,
        wc.accountsPayable,
        wc.otherCurrentAssets,
        wc.otherCurrentLiabilities,
        wc.workingCapitalNeed,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `working-capital-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${entriesToExport.length} working capital entry(ies) exported`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Working Capital (BFR)</h1>
          <p className="text-muted-foreground mt-2">
            Track your working capital needs and cash flow requirements
          </p>
        </div>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
            <option key={year} value={year.toString()}>{year}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current BFR</CardTitle>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.latestBFR >= 0 ? 'text-primary' : 'text-red-600'}`}>
                {formatCurrency(summary.latestBFR)}
              </div>
              <p className={`text-xs ${summary.bfrChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.bfrChange >= 0 ? '+' : ''}{formatCurrency(summary.bfrChange)} change
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg BFR</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.avgBFR)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.monthCount} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receivables</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalReceivables)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(summary.totalReceivables / summary.monthCount)}/mo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payables</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalPayables)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(summary.totalPayables / summary.monthCount)}/mo
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
          <Card>
            <CardHeader>
              <CardTitle>BFR Trend</CardTitle>
              <CardDescription>Working capital need evolution over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : filteredWorkingCapital.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={filteredWorkingCapital}>
                    <defs>
                      <linearGradient id="colorBFR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="workingCapitalNeed" 
                      stroke="#8884d8" 
                      fillOpacity={1} 
                      fill="url(#colorBFR)" 
                      name="BFR"
                    />
                    <Line 
                      type="monotone" 
                      dataKey={(d) => 0}
                      stroke="#ef4444" 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      name="Zero Line"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Receivables vs Payables */}
            <Card>
              <CardHeader>
                <CardTitle>Receivables vs Payables</CardTitle>
                <CardDescription>Comparison of current assets and liabilities</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : filteredWorkingCapital.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredWorkingCapital}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="accountsReceivable" fill="#3b82f6" name="Receivables" />
                      <Bar dataKey="accountsPayable" fill="#ef4444" name="Payables" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Trend</CardTitle>
                <CardDescription>Inventory levels over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : filteredWorkingCapital.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={filteredWorkingCapital}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Line 
                        type="monotone" 
                        dataKey="inventory" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        name="Inventory"
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
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Working Capital Components</CardTitle>
              <CardDescription>Detailed breakdown of BFR components over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : filteredWorkingCapital.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={filteredWorkingCapital}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="accountsReceivable" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Receivables"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="inventory" 
                      stackId="1"
                      stroke="#22c55e" 
                      fill="#22c55e"
                      fillOpacity={0.6}
                      name="Inventory"
                    />
                    <Bar 
                      dataKey="accountsPayable" 
                      fill="#ef4444" 
                      name="Payables"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="workingCapitalNeed" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      name="BFR"
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
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BFR Components Breakdown</CardTitle>
              <CardDescription>Stacked view of all working capital components</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : filteredWorkingCapital.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={filteredWorkingCapital}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="accountsReceivable" stackId="a" fill="#3b82f6" name="Receivables" />
                    <Bar dataKey="inventory" stackId="a" fill="#22c55e" name="Inventory" />
                    <Bar dataKey="otherCurrentAssets" stackId="a" fill="#06b6d4" name="Other Assets" />
                    <Bar dataKey="accountsPayable" stackId="b" fill="#ef4444" name="Payables" />
                    <Bar dataKey="otherCurrentLiabilities" stackId="b" fill="#f97316" name="Other Liabilities" />
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
              createHref="/working-capital/create"
            data={workingCapital || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(wc) => router.push(`/working-capital/${wc.id}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            sortColumns={[
              { value: "month", label: "Month", type: "character varying" },
              { value: "workingCapitalNeed", label: "Working Capital Need", type: "numeric" },
            ]}
            localStoragePrefix="working-capital"
            searchFields={[]}
          />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}

