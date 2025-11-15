"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useLeasing, useDeleteLeasing, useLeasingAnalytics } from "@kit/hooks";
import type { LeasingPayment, LeasingType, ExpenseRecurrence } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Building2, Calendar, DollarSign } from "lucide-react";

const COLORS = ['#a855f7', '#3b82f6'];

export default function LeasingContent() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const { data: leasing, isLoading } = useLeasing();
  const { data: analytics, isLoading: analyticsLoading } = useLeasingAnalytics(selectedYear);
  const deleteMutation = useDeleteLeasing();

  // Calculate summary stats
  const activeLeasing = useMemo(() => {
    return leasing?.filter(l => l.isActive) || [];
  }, [leasing]);

  const totalMonthly = useMemo(() => {
    if (!leasing) return 0;
    return leasing.reduce((sum, lease) => {
      switch (lease.frequency) {
        case 'monthly':
          return sum + lease.amount;
        case 'quarterly':
          return sum + lease.amount / 3;
        case 'yearly':
          return sum + lease.amount / 12;
        default:
          return sum + lease.amount;
      }
    }, 0);
  }, [leasing]);

  const columns: ColumnDef<LeasingPayment>[] = useMemo(() => [
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
        const typeLabels: Record<LeasingType, string> = {
          operating: "Operating",
          finance: "Finance",
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
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => {
        const frequency = row.original.frequency;
        const frequencyLabels: Record<ExpenseRecurrence, string> = {
          one_time: "One Time",
          monthly: "Monthly",
          quarterly: "Quarterly",
          yearly: "Yearly",
          custom: "Custom",
        };
        return (
          <span className="text-sm text-muted-foreground">
            {frequencyLabels[frequency] || frequency}
          </span>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => 
        row.original.endDate ? formatDate(row.original.endDate) : <span className="text-muted-foreground">—</span>
    },
    {
      accessorKey: "lessor",
      header: "Lessor",
      cell: ({ row }) => row.original.lessor || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this leasing payment?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Leasing payment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete leasing payment");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} leasing payment(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} leasing payment(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete leasing payments");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: LeasingPayment[], type: 'selected' | 'all') => {
    const leasingToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Amount', 'Frequency', 'Start Date', 'End Date', 'Lessor', 'Description'].join(','),
      ...leasingToCopy.map(lease => [
        lease.name,
        lease.type,
        lease.amount,
        lease.frequency,
        lease.startDate,
        lease.endDate || '',
        lease.lessor || '',
        lease.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${leasingToCopy.length} leasing payment(s) copied to clipboard`);
  };

  const handleBulkExport = (data: LeasingPayment[], type: 'selected' | 'all') => {
    const leasingToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Amount', 'Frequency', 'Start Date', 'End Date', 'Lessor', 'Description'].join(','),
      ...leasingToExport.map(lease => [
        lease.name,
        lease.type,
        lease.amount,
        lease.frequency,
        lease.startDate,
        lease.endDate || '',
        lease.lessor || '',
        lease.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leasing-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${leasingToExport.length} leasing payment(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leasing Payments</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your leasing and rental obligations
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => router.push('/leasing/timeline')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Timeline
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leases</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leasing?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeLeasing.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthly)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.totalAnnual ? `~${formatCurrency(analytics.summary.totalAnnual)} annually` : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Lease</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leasing && leasing.length > 0 
                ? formatCurrency(totalMonthly / leasing.length)
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">Monthly average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Types</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(leasing?.map(l => l.type) || []).size}
            </div>
            <p className="text-xs text-muted-foreground">Active types</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Leases by Type</CardTitle>
                <CardDescription>Distribution of leases across types</CardDescription>
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
                        dataKey="annualCost"
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

            {/* Monthly Leasing */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Leasing Costs</CardTitle>
                <CardDescription>Leasing payments by month for {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="total" fill="#a855f7" />
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

          {/* Top Leases */}
          {analytics?.topLeases && analytics.topLeases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Leases (Annual Cost)</CardTitle>
                <CardDescription>Your highest annual leasing costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topLeases.map((lease, idx) => (
                    <div key={lease.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{lease.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {lease.type}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(lease.annualCost)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(lease.monthlyAmount)}/mo
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leasing Trend</CardTitle>
              <CardDescription>Monthly leasing cost evolution over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorLeasing" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
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
                      stroke="#a855f7" 
                      fillOpacity={1} 
                      fill="url(#colorLeasing)" 
                      name="Total Leasing"
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
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <div className="-mx-4">
            <DataTablePage
              title=""
              description=""
              createHref="/leasing/create"
            data={leasing || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(lease) => router.push(`/leasing/${lease.id}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            filterColumns={[
              { value: "type", label: "Type" },
              { value: "frequency", label: "Frequency" },
              { value: "isActive", label: "Status" },
            ]}
            sortColumns={[
              { value: "name", label: "Name", type: "character varying" },
              { value: "amount", label: "Amount", type: "numeric" },
              { value: "startDate", label: "Start Date", type: "date" },
            ]}
            localStoragePrefix="leasing"
            searchFields={["name", "description", "lessor"]}
          />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

