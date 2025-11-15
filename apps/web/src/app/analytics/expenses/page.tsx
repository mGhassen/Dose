"use client";

import { useYear } from "@/contexts/year-context";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { formatCurrency } from "@kit/lib/config";
import { useExpensesAnalytics } from "@kit/hooks";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function ExpensesAnalyticsPage() {
  const { selectedYear } = useYear();
  const expensesAnalytics = useExpensesAnalytics({ year: selectedYear });

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Expenses Analytics</h1>
          <p className="text-muted-foreground">Comprehensive analytics for expenses</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                  <CardDescription>Distribution of expenses across categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {expensesAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : expensesAnalytics.data?.categoryBreakdown && expensesAnalytics.data.categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={expensesAnalytics.data.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {expensesAnalytics.data.categoryBreakdown.map((entry, index) => (
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

              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Recurrence</CardTitle>
                  <CardDescription>Annual cost by recurrence type</CardDescription>
                </CardHeader>
                <CardContent>
                  {expensesAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : expensesAnalytics.data?.recurrenceBreakdown && expensesAnalytics.data.recurrenceBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={expensesAnalytics.data.recurrenceBreakdown}>
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

            {expensesAnalytics.data?.topExpenses && expensesAnalytics.data.topExpenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Expenses (Annual Cost)</CardTitle>
                  <CardDescription>Your highest annual expense items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expensesAnalytics.data.topExpenses.map((exp, idx) => (
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
                {expensesAnalytics.isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">Loading...</div>
                ) : expensesAnalytics.data?.monthlyTrend && expensesAnalytics.data.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={expensesAnalytics.data.monthlyTrend}>
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

            {expensesAnalytics.data?.monthlyTrend && expensesAnalytics.data.monthlyTrend.length > 0 && expensesAnalytics.data.categoryBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle>Category Trends</CardTitle>
                  <CardDescription>Monthly spending by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={expensesAnalytics.data.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      {expensesAnalytics.data.categoryBreakdown.slice(0, 6).map((cat, idx) => (
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
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown (Bar)</CardTitle>
                  <CardDescription>Monthly spending by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {expensesAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : expensesAnalytics.data?.categoryBreakdown && expensesAnalytics.data.categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={expensesAnalytics.data.categoryBreakdown} layout="vertical">
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

              <Card>
                <CardHeader>
                  <CardTitle>Category Details</CardTitle>
                  <CardDescription>Detailed breakdown with percentages</CardDescription>
                </CardHeader>
                <CardContent>
                  {expensesAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : expensesAnalytics.data?.categoryBreakdown && expensesAnalytics.data.categoryBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {[...expensesAnalytics.data.categoryBreakdown]
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
        </Tabs>
      </div>
    </AppLayout>
  );
}

