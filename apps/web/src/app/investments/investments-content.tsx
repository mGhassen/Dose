"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useInvestments, useDeleteInvestment, useInvestmentsAnalytics } from "@kit/hooks";
import type { Investment, InvestmentType, DepreciationMethod } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
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
import { TrendingUp, TrendingDown, DollarSign, Building2, Calculator, BarChart3 } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function InvestmentsContent() {
  const router = useRouter();
  const { data: investments, isLoading } = useInvestments();
  const { data: analytics, isLoading: analyticsLoading } = useInvestmentsAnalytics();
  const deleteMutation = useDeleteInvestment();

  const columns: ColumnDef<Investment>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        const typeLabels: Record<InvestmentType, string> = {
          equipment: "Equipment",
          renovation: "Renovation",
          technology: "Technology",
          vehicle: "Vehicle",
          other: "Other",
        };
        return (
          <Badge variant="outline">
            {typeLabels[type] || type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "purchaseDate",
      header: "Purchase Date",
      cell: ({ row }) => formatDate(row.original.purchaseDate),
    },
    {
      accessorKey: "usefulLifeMonths",
      header: "Useful Life",
      cell: ({ row }) => `${row.original.usefulLifeMonths} months`,
    },
    {
      accessorKey: "depreciationMethod",
      header: "Depreciation Method",
      cell: ({ row }) => {
        const method = row.original.depreciationMethod;
        const methodLabels: Record<DepreciationMethod, string> = {
          straight_line: "Straight Line",
          declining_balance: "Declining Balance",
          units_of_production: "Units of Production",
        };
        return (
          <span className="text-sm text-muted-foreground">
            {methodLabels[method] || method}
          </span>
        );
      },
    },
    {
      accessorKey: "residualValue",
      header: "Residual Value",
      cell: ({ row }) => formatCurrency(row.original.residualValue),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this investment?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Investment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete investment");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} investment(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} investment(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete investments");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Investment[], type: 'selected' | 'all') => {
    const investmentsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Amount', 'Purchase Date', 'Useful Life (Months)', 'Depreciation Method', 'Residual Value', 'Description'].join(','),
      ...investmentsToCopy.map(inv => [
        inv.name,
        inv.type,
        inv.amount,
        inv.purchaseDate,
        inv.usefulLifeMonths,
        inv.depreciationMethod,
        inv.residualValue,
        inv.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${investmentsToCopy.length} investment(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Investment[], type: 'selected' | 'all') => {
    const investmentsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Amount', 'Purchase Date', 'Useful Life (Months)', 'Depreciation Method', 'Residual Value', 'Description'].join(','),
      ...investmentsToExport.map(inv => [
        inv.name,
        inv.type,
        inv.amount,
        inv.purchaseDate,
        inv.usefulLifeMonths,
        inv.depreciationMethod,
        inv.residualValue,
        inv.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${investmentsToExport.length} investment(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments & Assets</h1>
          <p className="text-muted-foreground mt-2">
            Track your capital investments, depreciation, and asset values
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.totalPurchaseValue ? formatCurrency(analytics.summary.totalPurchaseValue) : 'Calculating...'} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary.totalPurchaseValue ? formatCurrency(analytics.summary.totalPurchaseValue) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.avgInvestmentValue ? `Avg: ${formatCurrency(analytics.summary.avgInvestmentValue)}` : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Book Value</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics?.summary.totalBookValue ? formatCurrency(analytics.summary.totalBookValue) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current asset value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Depreciation</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics?.summary.totalAccumulatedDepreciation ? formatCurrency(analytics.summary.totalAccumulatedDepreciation) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.depreciationRate ? `${analytics.summary.depreciationRate.toFixed(1)}% of purchase` : 'Calculating...'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="assets">Asset Value</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Investments by Type</CardTitle>
                <CardDescription>Distribution of investments across asset types</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.typeBreakdown && analytics.typeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.typeBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalAmount"
                      >
                        {analytics.typeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Depreciation Method */}
            <Card>
              <CardHeader>
                <CardTitle>Depreciation Methods</CardTitle>
                <CardDescription>Distribution by depreciation calculation method</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.methodBreakdown && analytics.methodBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.methodBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="method" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="totalAmount" fill="#8884d8" name="Total Value" />
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

          {/* Top Investments */}
          {analytics?.topInvestments && analytics.topInvestments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Investments by Purchase Value</CardTitle>
                <CardDescription>Your highest value capital investments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topInvestments.map((inv, idx) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{inv.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {inv.type}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-semibold">{formatCurrency(inv.purchaseValue)}</div>
                        <div className="text-xs text-muted-foreground">
                          Book: {formatCurrency(inv.bookValue)} • Dep: {formatCurrency(inv.depreciation)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="depreciation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Depreciation Trend</CardTitle>
              <CardDescription>Depreciation expenses over time</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : analytics?.monthlyDepreciation && analytics.monthlyDepreciation.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics.monthlyDepreciation}>
                    <defs>
                      <linearGradient id="colorDepreciation" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="total" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorDepreciation)" 
                      name="Monthly Depreciation"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No depreciation data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Value Evolution</CardTitle>
              <CardDescription>Purchase value vs book value over time</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : analytics?.assetValueOverTime && analytics.assetValueOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={analytics.assetValueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="purchaseValue" 
                      stroke="#22c55e" 
                      fill="#22c55e"
                      fillOpacity={0.6}
                      name="Purchase Value"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="bookValue" 
                      stroke="#3b82f6" 
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Book Value"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="depreciation" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Accumulated Depreciation"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No asset value data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <DataTablePage
            title=""
            description=""
            createHref="/investments/create"
            data={investments || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(investment) => router.push(`/investments/${investment.id}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            filterColumns={[
              { value: "type", label: "Type" },
              { value: "depreciationMethod", label: "Depreciation Method" },
            ]}
            sortColumns={[
              { value: "name", label: "Name", type: "character varying" },
              { value: "amount", label: "Amount", type: "numeric" },
              { value: "purchaseDate", label: "Purchase Date", type: "date" },
            ]}
            localStoragePrefix="investments"
            searchFields={["name", "description"]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

