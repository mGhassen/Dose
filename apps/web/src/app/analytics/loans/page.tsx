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
  Area
} from 'recharts';
import { formatCurrency } from "@kit/lib/config";
import { useLoansAnalytics } from "@kit/hooks";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function LoansAnalyticsPage() {
  const loansAnalytics = useLoansAnalytics();

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Loans Analytics</h1>
          <p className="text-muted-foreground">Comprehensive analytics for loans</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Loans by Status</CardTitle>
                  <CardDescription>Distribution of loans by status</CardDescription>
                </CardHeader>
                <CardContent>
                  {loansAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : loansAnalytics.data?.statusBreakdown && loansAnalytics.data.statusBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={loansAnalytics.data.statusBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="totalPrincipal"
                        >
                          {loansAnalytics.data.statusBreakdown.map((entry, index) => (
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
                  <CardTitle>Loan Status Count</CardTitle>
                  <CardDescription>Number of loans by status</CardDescription>
                </CardHeader>
                <CardContent>
                  {loansAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : loansAnalytics.data?.statusBreakdown && loansAnalytics.data.statusBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={loansAnalytics.data.statusBreakdown}>
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
                {loansAnalytics.isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">Loading...</div>
                ) : loansAnalytics.data?.monthlyPayments && loansAnalytics.data.monthlyPayments.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={loansAnalytics.data.monthlyPayments}>
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
              <Card>
                <CardHeader>
                  <CardTitle>Principal vs Interest</CardTitle>
                  <CardDescription>Monthly breakdown of payment components</CardDescription>
                </CardHeader>
                <CardContent>
                  {loansAnalytics.isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">Loading...</div>
                  ) : loansAnalytics.data?.monthlyPayments && loansAnalytics.data.monthlyPayments.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={loansAnalytics.data.monthlyPayments}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="principal" stackId="a" fill="#22c55e" name="Principal" />
                        <Bar dataKey="interest" stackId="a" fill="#ef4444" name="Interest" />
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
        </Tabs>
      </div>
    </AppLayout>
  );
}

