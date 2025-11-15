"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useLoans, useDeleteLoan, useLoansAnalytics } from "@kit/hooks";
import type { Loan, LoanStatus } from "@kit/types";
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
import { TrendingUp, TrendingDown, DollarSign, Percent, CreditCard, Calendar } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function LoansContent() {
  const router = useRouter();
  const { data: loans, isLoading } = useLoans();
  const { data: analytics, isLoading: analyticsLoading } = useLoansAnalytics();
  const deleteMutation = useDeleteLoan();

  // Calculate summary stats
  const activeLoans = useMemo(() => {
    return loans?.filter(l => l.status === 'active') || [];
  }, [loans]);

  const totalPrincipal = useMemo(() => {
    return loans?.reduce((sum, loan) => sum + loan.principalAmount, 0) || 0;
  }, [loans]);

  const columns: ColumnDef<Loan>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "loanNumber",
      header: "Loan Number",
      cell: ({ row }) => row.original.loanNumber,
    },
    {
      accessorKey: "principalAmount",
      header: "Principal",
      cell: ({ row }) => formatCurrency(row.original.principalAmount),
    },
    {
      accessorKey: "interestRate",
      header: "Interest Rate",
      cell: ({ row }) => `${row.original.interestRate}%`,
    },
    {
      accessorKey: "durationMonths",
      header: "Duration",
      cell: ({ row }) => `${row.original.durationMonths} months`,
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const statusLabels: Record<LoanStatus, string> = {
          active: "Active",
          paid_off: "Paid Off",
          defaulted: "Defaulted",
        };
        const variants: Record<LoanStatus, "default" | "secondary" | "destructive"> = {
          active: "default",
          paid_off: "secondary",
          defaulted: "destructive",
        };
        return (
          <Badge variant={variants[status]}>
            {statusLabels[status] || status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "lender",
      header: "Lender",
      cell: ({ row }) => row.original.lender || <span className="text-muted-foreground">—</span>,
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this loan?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Loan deleted successfully");
    } catch (error) {
      toast.error("Failed to delete loan");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} loan(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} loan(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete loans");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Loan[], type: 'selected' | 'all') => {
    const loansToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Loan Number', 'Principal Amount', 'Interest Rate', 'Duration (Months)', 'Start Date', 'Status', 'Lender', 'Description'].join(','),
      ...loansToCopy.map(loan => [
        loan.name,
        loan.loanNumber,
        loan.principalAmount,
        loan.interestRate,
        loan.durationMonths,
        loan.startDate,
        loan.status,
        loan.lender || '',
        loan.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${loansToCopy.length} loan(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Loan[], type: 'selected' | 'all') => {
    const loansToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Loan Number', 'Principal Amount', 'Interest Rate', 'Duration (Months)', 'Start Date', 'Status', 'Lender', 'Description'].join(','),
      ...loansToExport.map(loan => [
        loan.name,
        loan.loanNumber,
        loan.principalAmount,
        loan.interestRate,
        loan.durationMonths,
        loan.startDate,
        loan.status,
        loan.lender || '',
        loan.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loans-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${loansToExport.length} loan(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your loans and debt obligations
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeLoans.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Principal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPrincipal)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.totalRemaining ? `${formatCurrency(analytics.summary.totalRemaining)} remaining` : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics?.summary.totalInterest ? formatCurrency(analytics.summary.totalInterest) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.avgInterestRate ? `Avg rate: ${analytics.summary.avgInterestRate.toFixed(2)}%` : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics?.summary.totalPaid ? formatCurrency(analytics.summary.totalPaid) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Principal + Interest
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Loans by Status</CardTitle>
                <CardDescription>Distribution of loans by status</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.statusBreakdown && analytics.statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.statusBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalPrincipal"
                      >
                        {analytics.statusBreakdown.map((entry, index) => (
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

            {/* Status Count */}
            <Card>
              <CardHeader>
                <CardTitle>Loan Status Count</CardTitle>
                <CardDescription>Number of loans by status</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.statusBreakdown && analytics.statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.statusBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" name="Loan Count" />
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

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Payment Schedule</CardTitle>
              <CardDescription>Principal and interest payments over time</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : analytics?.monthlyPayments && analytics.monthlyPayments.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics.monthlyPayments}>
                    <defs>
                      <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="principal" 
                      stackId="1"
                      stroke="#22c55e" 
                      fill="url(#colorPrincipal)" 
                      name="Principal"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="interest" 
                      stackId="1"
                      stroke="#ef4444" 
                      fill="url(#colorInterest)" 
                      name="Interest"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No payment data available
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Principal vs Interest */}
            <Card>
              <CardHeader>
                <CardTitle>Principal vs Interest</CardTitle>
                <CardDescription>Monthly breakdown of payment components</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.monthlyPayments && analytics.monthlyPayments.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.monthlyPayments}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="principal" fill="#22c55e" name="Principal" />
                      <Bar dataKey="interest" fill="#ef4444" name="Interest" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Next 12 months of loan payments</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.upcomingPayments && analytics.upcomingPayments.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.upcomingPayments}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="total" fill="#8884d8" name="Total Payment" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No upcoming payments
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
              createHref="/loans/create"
            data={loans || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(loan) => router.push(`/loans/${loan.id}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            filterColumns={[
              { value: "status", label: "Status" },
            ]}
            sortColumns={[
              { value: "name", label: "Name", type: "character varying" },
              { value: "principalAmount", label: "Principal", type: "numeric" },
              { value: "startDate", label: "Start Date", type: "date" },
            ]}
            localStoragePrefix="loans"
            searchFields={["name", "loanNumber", "lender", "description"]}
          />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

