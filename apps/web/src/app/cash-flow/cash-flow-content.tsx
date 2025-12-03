"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useCashFlow, useDeleteCashFlow } from "@kit/hooks";
import type { CashFlowEntry } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import AppLayout from "@/components/app-layout";
import { formatCurrency } from "@kit/lib/config";
import { formatMonthYear } from "@kit/lib/date-format";
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
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { useYear } from "@/contexts/year-context";

export default function CashFlowContent() {
  const router = useRouter();
  const { selectedYear } = useYear();
  const { data: cashFlow, isLoading } = useCashFlow();
  const deleteMutation = useDeleteCashFlow();

  // Filter and sort cash flow data
  const filteredCashFlow = useMemo(() => {
    if (!cashFlow) return [];
    return cashFlow
      .filter(entry => entry.month.startsWith(selectedYear))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [cashFlow, selectedYear]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!filteredCashFlow.length) return null;
    
    const totalInflows = filteredCashFlow.reduce((sum, entry) => sum + entry.cashInflows, 0);
    const totalOutflows = filteredCashFlow.reduce((sum, entry) => sum + entry.cashOutflows, 0);
    const avgInflows = totalInflows / filteredCashFlow.length;
    const avgOutflows = totalOutflows / filteredCashFlow.length;
    const latestBalance = filteredCashFlow[filteredCashFlow.length - 1]?.closingBalance || 0;
    const firstBalance = filteredCashFlow[0]?.openingBalance || 0;
    const balanceChange = latestBalance - firstBalance;
    
    return {
      totalInflows,
      totalOutflows,
      avgInflows,
      avgOutflows,
      latestBalance,
      balanceChange,
      netFlow: totalInflows - totalOutflows,
    };
  }, [filteredCashFlow]);

  const columns: ColumnDef<CashFlowEntry>[] = useMemo(() => [
    {
      accessorKey: "month",
      header: "Month",
      cell: ({ row }) => {
        const month = row.original.month;
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return formatMonthYear(date);
      },
    },
    {
      accessorKey: "openingBalance",
      header: "Opening Balance",
      cell: ({ row }) => formatCurrency(row.original.openingBalance),
    },
    {
      accessorKey: "cashInflows",
      header: "Inflows",
      cell: ({ row }) => (
        <span className="text-green-600 font-medium">
          {formatCurrency(row.original.cashInflows)}
        </span>
      ),
    },
    {
      accessorKey: "cashOutflows",
      header: "Outflows",
      cell: ({ row }) => (
        <span className="text-red-600 font-medium">
          {formatCurrency(row.original.cashOutflows)}
        </span>
      ),
    },
    {
      accessorKey: "netCashFlow",
      header: "Net Cash Flow",
      cell: ({ row }) => {
        const net = row.original.netCashFlow;
        return (
          <span className={net >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
            {formatCurrency(net)}
          </span>
        );
      },
    },
    {
      accessorKey: "closingBalance",
      header: "Closing Balance",
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.original.closingBalance)}
        </span>
      ),
    },
  ], []);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Cash flow entry deleted successfully");
    } catch (error) {
      toast.error("Failed to delete cash flow entry");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
      toast.success(`${ids.length} cash flow entry(ies) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete cash flow entries");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: CashFlowEntry[], type: 'selected' | 'all') => {
    const entriesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Opening Balance', 'Cash Inflows', 'Cash Outflows', 'Net Cash Flow', 'Closing Balance', 'Notes'].join(','),
      ...entriesToCopy.map(entry => [
        entry.month,
        entry.openingBalance,
        entry.cashInflows,
        entry.cashOutflows,
        entry.netCashFlow,
        entry.closingBalance,
        entry.notes || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${entriesToCopy.length} cash flow entry(ies) copied to clipboard`);
  };

  const handleBulkExport = (data: CashFlowEntry[], type: 'selected' | 'all') => {
    const entriesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Opening Balance', 'Cash Inflows', 'Cash Outflows', 'Net Cash Flow', 'Closing Balance', 'Notes'].join(','),
      ...entriesToExport.map(entry => [
        entry.month,
        entry.openingBalance,
        entry.cashInflows,
        entry.cashOutflows,
        entry.netCashFlow,
        entry.closingBalance,
        entry.notes || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${entriesToExport.length} cash flow entry(ies) exported`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cash Flow</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and analyze your cash flow and treasury position
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.latestBalance)}</div>
              <p className={`text-xs ${summary.balanceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.balanceChange >= 0 ? '+' : ''}{formatCurrency(summary.balanceChange)} change
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalInflows)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(summary.avgInflows)}/month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outflows</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutflows)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(summary.avgOutflows)}/month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
              {summary.netFlow >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netFlow)}
              </div>
              <p className="text-xs text-muted-foreground">For {selectedYear}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="flow">Flow Analysis</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Inflows vs Outflows */}
            <Card>
              <CardHeader>
                <CardTitle>Inflows vs Outflows</CardTitle>
                <CardDescription>Monthly cash inflows and outflows comparison</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : filteredCashFlow.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredCashFlow}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="cashInflows" fill="#22c55e" name="Inflows" />
                      <Bar dataKey="cashOutflows" fill="#ef4444" name="Outflows" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Net Cash Flow */}
            <Card>
              <CardHeader>
                <CardTitle>Net Cash Flow</CardTitle>
                <CardDescription>Monthly net cash flow (inflows - outflows)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : filteredCashFlow.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredCashFlow}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar 
                        dataKey="netCashFlow" 
                        fill={(entry: any) => entry.netCashFlow >= 0 ? '#22c55e' : '#ef4444'}
                        name="Net Cash Flow"
                      >
                        {filteredCashFlow.map((entry, index) => (
                          <Bar key={index} fill={entry.netCashFlow >= 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
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

          {/* Balance Evolution */}
          <Card>
            <CardHeader>
              <CardTitle>Balance Evolution</CardTitle>
              <CardDescription>Opening and closing balance over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : filteredCashFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredCashFlow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="openingBalance" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Opening Balance"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="closingBalance" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Closing Balance"
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
              <CardTitle>Cash Flow Trend</CardTitle>
              <CardDescription>Inflows, outflows, and net flow over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : filteredCashFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={filteredCashFlow}>
                    <defs>
                      <linearGradient id="colorInflows" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOutflows" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cashInflows" 
                      stroke="#22c55e" 
                      fillOpacity={1} 
                      fill="url(#colorInflows)" 
                      name="Inflows"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cashOutflows" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorOutflows)" 
                      name="Outflows"
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

          {/* Closing Balance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Closing Balance Trend</CardTitle>
              <CardDescription>Evolution of closing balance over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : filteredCashFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={filteredCashFlow}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area 
                      type="monotone" 
                      dataKey="closingBalance" 
                      stroke="#8884d8" 
                      fillOpacity={1} 
                      fill="url(#colorBalance)" 
                      name="Closing Balance"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Composition</CardTitle>
              <CardDescription>Detailed breakdown of inflows, outflows, and net flow</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : filteredCashFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={filteredCashFlow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="cashInflows" fill="#22c55e" name="Inflows" />
                    <Bar yAxisId="left" dataKey="cashOutflows" fill="#ef4444" name="Outflows" />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="netCashFlow" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      name="Net Flow"
                    />
                  </ComposedChart>
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
              createHref="/cash-flow/create"
            data={filteredCashFlow || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(entry) => router.push(`/cash-flow/${entry.id}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            sortColumns={[
              { value: "month", label: "Month", type: "character varying" },
              { value: "closingBalance", label: "Closing Balance", type: "numeric" },
            ]}
            localStoragePrefix="cash-flow"
            searchFields={["notes"]}
          />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}

