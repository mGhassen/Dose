"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useExpenses, useDeleteExpense, useExpensesAnalytics } from "@kit/hooks";
import type { Expense, ExpenseCategory, ExpenseRecurrence } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { 
  PieChart, 
  Pie, 
  Cell, 
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
  Area
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Calendar } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function ExpensesContent() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const { data: expenses, isLoading } = useExpenses();
  const { data: analytics, isLoading: analyticsLoading } = useExpensesAnalytics(selectedYear);
  const deleteMutation = useDeleteExpense();

  const columns: ColumnDef<Expense>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.original.category;
        const categoryLabels: Record<ExpenseCategory, string> = {
          rent: "Rent",
          utilities: "Utilities",
          supplies: "Supplies",
          marketing: "Marketing",
          insurance: "Insurance",
          maintenance: "Maintenance",
          professional_services: "Professional Services",
          other: "Other",
        };
        return (
          <Badge variant="outline">
            {categoryLabels[category] || category}
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
      accessorKey: "recurrence",
      header: "Recurrence",
      cell: ({ row }) => {
        const recurrence = row.original.recurrence;
        const recurrenceLabels: Record<ExpenseRecurrence, string> = {
          one_time: "One Time",
          monthly: "Monthly",
          quarterly: "Quarterly",
          yearly: "Yearly",
          custom: "Custom",
        };
        return (
          <span className="text-sm text-muted-foreground">
            {recurrenceLabels[recurrence] || recurrence}
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
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => row.original.vendor || <span className="text-muted-foreground">—</span>,
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
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Expense deleted successfully");
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} expense(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} expense(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete expenses");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Expense[], type: 'selected' | 'all') => {
    const expensesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Category', 'Amount', 'Recurrence', 'Start Date', 'End Date', 'Vendor', 'Description'].join(','),
      ...expensesToCopy.map(exp => [
        exp.name,
        exp.category,
        exp.amount,
        exp.recurrence,
        exp.startDate,
        exp.endDate || '',
        exp.vendor || '',
        exp.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${expensesToCopy.length} expense(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Expense[], type: 'selected' | 'all') => {
    const expensesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Category', 'Amount', 'Recurrence', 'Start Date', 'End Date', 'Vendor', 'Description'].join(','),
      ...expensesToExport.map(exp => [
        exp.name,
        exp.category,
        exp.amount,
        exp.recurrence,
        exp.startDate,
        exp.endDate || '',
        exp.vendor || '',
        exp.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${expensesToExport.length} expense(s) exported`);
  };

  // Calculate summary stats
  const totalMonthly = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, exp) => {
      switch (exp.recurrence) {
        case 'monthly':
          return sum + exp.amount;
        case 'quarterly':
          return sum + exp.amount / 3;
        case 'yearly':
          return sum + exp.amount / 12;
        default:
          return sum + exp.amount;
      }
    }, 0);
  }, [expenses]);

  const activeExpenses = useMemo(() => {
    return expenses?.filter(e => e.isActive) || [];
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your business expenses and charges
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
            onClick={() => router.push('/expenses/timeline')}
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
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeExpenses.length} active
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
            <CardTitle className="text-sm font-medium">Avg per Expense</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenses && expenses.length > 0 
                ? formatCurrency(totalMonthly / expenses.length)
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">Monthly average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(expenses?.map(e => e.category) || []).size}
            </div>
            <p className="text-xs text-muted-foreground">Active categories</p>
          </CardContent>
        </Card>
      </div>

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
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Distribution of expenses across categories</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {analytics.categoryBreakdown.map((entry, index) => (
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

            {/* Recurrence Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Recurrence</CardTitle>
                <CardDescription>Annual cost by recurrence type</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.recurrenceBreakdown && analytics.recurrenceBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.recurrenceBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="recurrence" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="#8884d8" />
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

          {/* Top Expenses */}
          {analytics?.topExpenses && analytics.topExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Expenses (Annual Cost)</CardTitle>
                <CardDescription>Your highest annual expense items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topExpenses.map((exp, idx) => (
                    <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{exp.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {exp.category.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(exp.annualCost)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(exp.monthlyAmount)}/mo
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
              <CardTitle>Monthly Spending Trend</CardTitle>
              <CardDescription>Expense evolution over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="total" 
                      stroke="#8884d8" 
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                      name="Total Expenses"
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

          {/* Category Trends */}
          {analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Trends</CardTitle>
                <CardDescription>Monthly spending by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    {analytics.categoryBreakdown.slice(0, 6).map((cat, idx) => (
                      <Line
                        key={cat.category}
                        type="monotone"
                        dataKey={cat.category}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2}
                        name={cat.category.replace('_', ' ')}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Category Breakdown Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown (Bar)</CardTitle>
                <CardDescription>Monthly spending by category</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.categoryBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" width={100} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Details */}
            <Card>
              <CardHeader>
                <CardTitle>Category Details</CardTitle>
                <CardDescription>Detailed breakdown with percentages</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {[...analytics.categoryBreakdown]
                      .sort((a, b) => b.amount - a.amount)
                      .map((cat, idx) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">{cat.category.replace('_', ' ')}</span>
                            <span className="text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${cat.percentage}%`,
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(cat.amount)}/month
                          </div>
                        </div>
                      ))}
                  </div>
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
              createHref="/expenses/create"
              data={expenses || []}
              columns={columns}
              loading={isLoading}
              onRowClick={(expense) => router.push(`/expenses/${expense.id}`)}
              onDelete={handleDelete}
              onBulkDelete={handleBulkDelete}
              onBulkCopy={handleBulkCopy}
              onBulkExport={handleBulkExport}
              filterColumns={[
                { value: "category", label: "Category" },
                { value: "recurrence", label: "Recurrence" },
                { value: "isActive", label: "Status" },
              ]}
              sortColumns={[
                { value: "name", label: "Name", type: "character varying" },
                { value: "amount", label: "Amount", type: "numeric" },
                { value: "startDate", label: "Start Date", type: "date" },
              ]}
              localStoragePrefix="expenses"
              searchFields={["name", "description", "vendor"]}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
