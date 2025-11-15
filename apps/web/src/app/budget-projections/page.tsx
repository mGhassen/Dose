"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Badge } from "@kit/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import AppLayout from "@/components/app-layout";
import { 
  Calendar, 
  TrendingUp, 
  Receipt, 
  Users, 
  Building2, 
  Download,
  DollarSign,
  Wallet
} from "lucide-react";
import { useBudgetProjections } from "@kit/hooks";
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
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#ef4444', '#3b82f6', '#a855f7', '#22c55e'];

interface MonthlyProjection {
  month: string;
  expenses: number;
  personnel: number;
  leasing: number;
  sales: number;
  total: number;
  items: Array<{
    type: string;
    amount: number;
    category?: string | null;
    referenceId: number | null;
    isProjected: boolean;
  }>;
}

export default function BudgetProjectionsAgendaPage() {
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + 11);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: projections, isLoading } = useBudgetProjections({
    startMonth,
    endMonth,
  });

  // Group projections by month
  const monthlyProjections = useMemo(() => {
    if (!projections) return {};

    const grouped: Record<string, MonthlyProjection> = {};

    projections.forEach(proj => {
      if (selectedType && proj.projection_type !== selectedType) return;

      if (!grouped[proj.month]) {
        grouped[proj.month] = {
          month: proj.month,
          expenses: 0,
          personnel: 0,
          leasing: 0,
          sales: 0,
          total: 0,
          items: [],
        };
      }

      const monthData = grouped[proj.month];
      monthData.items.push({
        type: proj.projection_type,
        amount: proj.amount,
        category: proj.category,
        referenceId: proj.reference_id,
        isProjected: proj.is_projected,
      });

      switch (proj.projection_type) {
        case 'expense':
          monthData.expenses += proj.amount;
          break;
        case 'personnel':
          monthData.personnel += proj.amount;
          break;
        case 'leasing':
          monthData.leasing += proj.amount;
          break;
        case 'sales':
          monthData.sales += proj.amount;
          break;
      }
      monthData.total = monthData.expenses + monthData.personnel + monthData.leasing - monthData.sales;
    });

    return grouped;
  }, [projections, selectedType]);

  const sortedMonths = useMemo(() => {
    return Object.keys(monthlyProjections).sort();
  }, [monthlyProjections]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const months = Object.values(monthlyProjections);
    if (months.length === 0) return null;

    const totalExpenses = months.reduce((sum, m) => sum + m.expenses, 0);
    const totalPersonnel = months.reduce((sum, m) => sum + m.personnel, 0);
    const totalLeasing = months.reduce((sum, m) => sum + m.leasing, 0);
    const totalSales = months.reduce((sum, m) => sum + m.sales, 0);
    const totalNet = months.reduce((sum, m) => sum + m.total, 0);
    const avgMonthly = months.length > 0 ? totalNet / months.length : 0;

    return {
      totalExpenses,
      totalPersonnel,
      totalLeasing,
      totalSales,
      totalNet,
      avgMonthly,
      monthCount: months.length,
    };
  }, [monthlyProjections]);

  // Chart data
  const chartData = useMemo(() => {
    return sortedMonths.map(month => {
      const data = monthlyProjections[month];
      return {
        month,
        expenses: data.expenses,
        personnel: data.personnel,
        leasing: data.leasing,
        sales: data.sales,
        total: data.total,
        outflows: data.expenses + data.personnel + data.leasing,
      };
    });
  }, [sortedMonths, monthlyProjections]);

  const handleExport = () => {
    const csv = [
      ['Month', 'Expenses', 'Personnel', 'Leasing', 'Sales', 'Net Total'].join(','),
      ...sortedMonths.map(month => {
        const data = monthlyProjections[month];
        return [
          month,
          data.expenses,
          data.personnel,
          data.leasing,
          data.sales,
          data.total,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-projections-${startMonth}-to-${endMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Budget projections exported successfully');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return <Receipt className="h-4 w-4" />;
      case 'personnel':
        return <Users className="h-4 w-4" />;
      case 'leasing':
        return <Building2 className="h-4 w-4" />;
      case 'sales':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'expense':
        return 'Expense';
      case 'personnel':
        return 'Personnel';
      case 'leasing':
        return 'Leasing';
      case 'sales':
        return 'Sales';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'expense':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'personnel':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'leasing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sales':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Projections Agenda</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive view of your financial projections and budget planning
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.monthCount} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalPersonnel)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.monthCount} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leasing</CardTitle>
              <Building2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalLeasing)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.monthCount} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalSales)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.monthCount} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Total</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalNet)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(summary.avgMonthly)}/mo
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select date range and projection type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startMonth">Start Month</Label>
              <Input
                id="startMonth"
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endMonth">End Month</Label>
              <Input
                id="endMonth"
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type">Projection Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || null)}
              >
                <option value="">All Types</option>
                <option value="expense">Expenses</option>
                <option value="personnel">Personnel</option>
                <option value="leasing">Leasing</option>
                <option value="sales">Sales</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  setStartMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                  const nextYear = new Date(now);
                  nextYear.setMonth(nextYear.getMonth() + 11);
                  setEndMonth(`${nextYear.getFullYear()}-${String(nextYear.getMonth() + 1).padStart(2, '0')}`);
                  setSelectedType(null);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Data */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">Charts & Trends</TabsTrigger>
          <TabsTrigger value="agenda">Monthly Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          {/* Projection Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Projection Trends</CardTitle>
              <CardDescription>Monthly evolution of all projection types</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPersonnel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLeasing" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stackId="1"
                      stroke="#ef4444" 
                      fill="url(#colorExpenses)" 
                      name="Expenses"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="personnel" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="url(#colorPersonnel)" 
                      name="Personnel"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="leasing" 
                      stackId="1"
                      stroke="#a855f7" 
                      fill="url(#colorLeasing)" 
                      name="Leasing"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#22c55e" 
                      fill="url(#colorSales)" 
                      name="Sales"
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
            {/* Inflows vs Outflows */}
            <Card>
              <CardHeader>
                <CardTitle>Inflows vs Outflows</CardTitle>
                <CardDescription>Sales vs total expenses</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="sales" fill="#22c55e" name="Sales (Inflows)" />
                      <Bar dataKey="outflows" fill="#ef4444" name="Total Outflows" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Net Total Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Net Total Trend</CardTitle>
                <CardDescription>Monthly net position (Sales - Outflows)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar 
                        dataKey="total" 
                        fill={(entry: any) => entry.total >= 0 ? '#22c55e' : '#ef4444'}
                        name="Net Total"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Trend"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Type Breakdown */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>Total Breakdown</CardTitle>
                <CardDescription>Overall distribution of projection types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Expenses', value: summary.totalExpenses },
                        { name: 'Personnel', value: summary.totalPersonnel },
                        { name: 'Leasing', value: summary.totalLeasing },
                        { name: 'Sales', value: summary.totalSales },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[summary.totalExpenses, summary.totalPersonnel, summary.totalLeasing, summary.totalSales].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agenda" className="space-y-4">
          {/* Monthly Projections */}
          {isLoading ? (
            <Card>
              <CardContent className="py-10">
                <div className="text-center text-muted-foreground">Loading projections...</div>
              </CardContent>
            </Card>
          ) : sortedMonths.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <div className="text-center text-muted-foreground">
                  No projections found for the selected date range
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
          {sortedMonths.map(month => {
            const data = monthlyProjections[month];
            const [year, monthNum] = month.split('-');
            const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const monthName = formatMonthYear(date);
            const isPast = date < new Date();
            const isCurrent = date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();

            return (
              <Card key={month} className={isCurrent ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-xl">{monthName}</CardTitle>
                        <CardDescription>
                          {data.items.length} projection{data.items.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isPast && <Badge variant="secondary">Past</Badge>}
                      {isCurrent && <Badge variant="default">Current</Badge>}
                      {!isPast && !isCurrent && <Badge variant="outline">Future</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Expenses</div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(data.expenses)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Personnel</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(data.personnel)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Leasing</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(data.leasing)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Sales</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(data.sales)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Net Total</div>
                      <div className={`text-2xl font-bold ${data.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data.total)}
                      </div>
                    </div>
                  </div>

                  {/* Projection Items */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Projection Details</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {data.items.map((item, idx) => (
                        <div
                          key={`${item.type}-${item.referenceId}-${idx}`}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${getTypeColor(item.type)}`}>
                              {getTypeIcon(item.type)}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{getTypeLabel(item.type)}</div>
                              {item.category && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  {item.category.replace('_', ' ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatCurrency(item.amount)}</div>
                            {item.isProjected && (
                              <Badge variant="secondary" className="text-xs mt-1">Projected</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}

