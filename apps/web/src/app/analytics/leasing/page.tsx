"use client";

import { useYear } from "@/contexts/year-context";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { 
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
import { useLeasingAnalytics } from "@kit/hooks";

const COLORS = ['#a855f7', '#3b82f6'];

export default function LeasingAnalyticsPage() {
  const { selectedYear } = useYear();
  const leasingAnalytics = useLeasingAnalytics({ year: selectedYear });

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leasing Analytics</h1>
          <p className="text-muted-foreground">Comprehensive analytics for leasing</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Leases by Type</CardTitle>
                  <CardDescription>Distribution of leases across types</CardDescription>
                </CardHeader>
                <CardContent>
                  {leasingAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : leasingAnalytics.data?.typeBreakdown && leasingAnalytics.data.typeBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={leasingAnalytics.data.typeBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="annualCost"
                        >
                          {leasingAnalytics.data.typeBreakdown.map((entry, index) => (
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
            </div>

            {leasingAnalytics.data?.topLeases && leasingAnalytics.data.topLeases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Leases</CardTitle>
                  <CardDescription>Highest cost leases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leasingAnalytics.data.topLeases.map((lease, idx) => (
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
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Leasing costs over time</CardDescription>
              </CardHeader>
              <CardContent>
                {leasingAnalytics.isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">Loading...</div>
                ) : leasingAnalytics.data?.monthlyTrend && leasingAnalytics.data.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={leasingAnalytics.data.monthlyTrend}>
                      <defs>
                        <linearGradient id="colorLeasing" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8dd1e1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8dd1e1" stopOpacity={0}/>
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
                        stroke="#8dd1e1" 
                        fillOpacity={1} 
                        fill="url(#colorLeasing)" 
                        name="Total Costs"
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
        </Tabs>
      </div>
    </AppLayout>
  );
}

