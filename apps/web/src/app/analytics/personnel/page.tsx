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
  Area,
  ComposedChart
} from 'recharts';
import { formatCurrency } from "@kit/lib/config";
import { usePersonnelAnalytics } from "@kit/hooks";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function PersonnelAnalyticsPage() {
  const { selectedYear } = useYear();
  const personnelAnalytics = usePersonnelAnalytics({ year: selectedYear });

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Personnel Analytics</h1>
          <p className="text-muted-foreground">Comprehensive analytics for personnel</p>
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
                  <CardTitle>Cost by Type</CardTitle>
                  <CardDescription>Distribution of costs across employee types</CardDescription>
                </CardHeader>
                <CardContent>
                  {personnelAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : personnelAnalytics.data?.typeBreakdown && personnelAnalytics.data.typeBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={personnelAnalytics.data.typeBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="monthlyCost"
                        >
                          {personnelAnalytics.data.typeBreakdown.map((entry, index) => (
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
                  <CardTitle>Cost by Position</CardTitle>
                  <CardDescription>Top positions by monthly cost</CardDescription>
                </CardHeader>
                <CardContent>
                  {personnelAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : personnelAnalytics.data?.positionBreakdown && personnelAnalytics.data.positionBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={personnelAnalytics.data.positionBreakdown.slice(0, 8)}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="position" type="category" width={120} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="monthlyCost" fill="#8884d8" />
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

            {personnelAnalytics.data?.topPositions && personnelAnalytics.data.topPositions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Positions by Cost</CardTitle>
                  <CardDescription>Highest cost positions in your organization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {personnelAnalytics.data.topPositions.map((pos, idx) => (
                      <div key={pos.position} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium">{pos.position}</div>
                            <div className="text-sm text-muted-foreground">
                              {pos.count} employee{pos.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(pos.annualCost)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(pos.monthlyCost)}/mo
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
                <CardTitle>Cost & Headcount Trend</CardTitle>
                <CardDescription>Monthly evolution of personnel costs and headcount</CardDescription>
              </CardHeader>
              <CardContent>
                {personnelAnalytics.isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">Loading...</div>
                ) : personnelAnalytics.data?.monthlyTrend && personnelAnalytics.data.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={personnelAnalytics.data.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'headcount') return [value, 'Headcount'];
                          return [formatCurrency(value), 'Cost'];
                        }}
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#8884d8" 
                        fill="#8884d8"
                        fillOpacity={0.6}
                        name="Monthly Cost"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="headcount" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        name="Headcount"
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
                <CardTitle>Position Breakdown</CardTitle>
                <CardDescription>Detailed breakdown by position</CardDescription>
              </CardHeader>
              <CardContent>
                {personnelAnalytics.isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : personnelAnalytics.data?.positionBreakdown && personnelAnalytics.data.positionBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {personnelAnalytics.data.positionBreakdown
                      .sort((a, b) => b.monthlyCost - a.monthlyCost)
                      .map((pos, idx) => (
                        <div key={pos.position} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{pos.position}</span>
                            <span className="text-muted-foreground">{pos.count} employees</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${(pos.monthlyCost / (personnelAnalytics.data.summary?.totalMonthlyCost || 1)) * 100}%`,
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(pos.monthlyCost)}/month
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

