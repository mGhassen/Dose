"use client";

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
  Area,
  ComposedChart,
  Line
} from 'recharts';
import { formatCurrency } from "@kit/lib/config";
import { useInvestmentsAnalytics } from "@kit/hooks";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function InvestmentsAnalyticsPage() {
  const investmentsAnalytics = useInvestmentsAnalytics();

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Investments Analytics</h1>
          <p className="text-muted-foreground">Comprehensive analytics for investments</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
            <TabsTrigger value="assets">Asset Value</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Investments by Type</CardTitle>
                  <CardDescription>Distribution of investments across asset types</CardDescription>
                </CardHeader>
                <CardContent>
                  {investmentsAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : investmentsAnalytics.data?.typeBreakdown && investmentsAnalytics.data.typeBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={investmentsAnalytics.data.typeBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="totalAmount"
                        >
                          {investmentsAnalytics.data.typeBreakdown.map((entry, index) => (
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
                  <CardTitle>Depreciation Methods</CardTitle>
                  <CardDescription>Distribution by depreciation calculation method</CardDescription>
                </CardHeader>
                <CardContent>
                  {investmentsAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : investmentsAnalytics.data?.methodBreakdown && investmentsAnalytics.data.methodBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={investmentsAnalytics.data.methodBreakdown}>
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

            {investmentsAnalytics.data?.topInvestments && investmentsAnalytics.data.topInvestments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Investments by Purchase Value</CardTitle>
                  <CardDescription>Your highest value capital investments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {investmentsAnalytics.data.topInvestments.map((inv, idx) => (
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
                {investmentsAnalytics.isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">Loading...</div>
                ) : investmentsAnalytics.data?.monthlyDepreciation && investmentsAnalytics.data.monthlyDepreciation.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={investmentsAnalytics.data.monthlyDepreciation}>
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
                <CardTitle>Asset Value Over Time</CardTitle>
                <CardDescription>Purchase value vs book value evolution</CardDescription>
              </CardHeader>
              <CardContent>
                {investmentsAnalytics.isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">Loading...</div>
                ) : investmentsAnalytics.data?.assetValueOverTime && investmentsAnalytics.data.assetValueOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={investmentsAnalytics.data.assetValueOverTime}>
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
                      <Line 
                        type="monotone" 
                        dataKey="bookValue" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Book Value"
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
        </Tabs>
      </div>
    </AppLayout>
  );
}

