"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { usePersonnel, useDeletePersonnel, usePersonnelAnalytics } from "@kit/hooks";
import type { Personnel, PersonnelType } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { useYear } from "@/contexts/year-context";
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
  Area,
  ComposedChart
} from 'recharts';
import { TrendingUp, Users, DollarSign, Briefcase, Calendar } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function PersonnelContent() {
  const router = useRouter();
  const { selectedYear } = useYear();
  const { data: personnel, isLoading } = usePersonnel();
  const { data: analytics, isLoading: analyticsLoading } = usePersonnelAnalytics(selectedYear);
  const deleteMutation = useDeletePersonnel();

  const columns: ColumnDef<Personnel>[] = useMemo(() => [
    {
      accessorKey: "firstName",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.firstName} {row.original.lastName}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "position",
      header: "Position",
      cell: ({ row }) => row.original.position,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        const typeLabels: Record<PersonnelType, string> = {
          full_time: "Full Time",
          part_time: "Part Time",
          contractor: "Contractor",
          intern: "Intern",
        };
        return (
          <Badge variant="outline">
            {typeLabels[type] || type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "baseSalary",
      header: "Base Salary",
      cell: ({ row }) => formatCurrency(row.original.baseSalary),
    },
    {
      accessorKey: "employerCharges",
      header: "Charges",
      cell: ({ row }) => {
        const charges = row.original.employerCharges;
        const chargesType = row.original.employerChargesType;
        return chargesType === 'percentage' 
          ? `${charges}%` 
          : formatCurrency(charges);
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
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
    if (!confirm("Are you sure you want to delete this personnel record?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Personnel record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete personnel record");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} personnel record(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} personnel record(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete personnel records");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Personnel[], type: 'selected' | 'all') => {
    const personnelToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Position', 'Type', 'Base Salary', 'Employer Charges', 'Charges Type', 'Start Date', 'End Date'].join(','),
      ...personnelToCopy.map(p => [
        p.firstName,
        p.lastName,
        p.email || '',
        p.position,
        p.type,
        p.baseSalary,
        p.employerCharges,
        p.employerChargesType,
        p.startDate,
        p.endDate || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${personnelToCopy.length} personnel record(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Personnel[], type: 'selected' | 'all') => {
    const personnelToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Position', 'Type', 'Base Salary', 'Employer Charges', 'Charges Type', 'Start Date', 'End Date'].join(','),
      ...personnelToExport.map(p => [
        p.firstName,
        p.lastName,
        p.email || '',
        p.position,
        p.type,
        p.baseSalary,
        p.employerCharges,
        p.employerChargesType,
        p.startDate,
        p.endDate || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personnel-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${personnelToExport.length} personnel record(s) exported`);
  };

  const totalMonthlyCost = useMemo(() => {
    if (!personnel) return 0;
    return personnel.reduce((sum, emp) => {
      const charges = emp.employerChargesType === 'percentage' 
        ? (emp.baseSalary * emp.employerCharges / 100)
        : (emp.employerCharges || 0);
      return sum + emp.baseSalary + charges;
    }, 0);
  }, [personnel]);

  const activePersonnel = useMemo(() => {
    return personnel?.filter(p => p.isActive) || [];
  }, [personnel]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnel</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your team costs and headcount
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personnel?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activePersonnel.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyCost)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.totalAnnualCost ? `~${formatCurrency(analytics.summary.totalAnnualCost)} annually` : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Salary</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary.averageSalary ? formatCurrency(analytics.summary.averageSalary) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">Per employee/month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Headcount</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary.averageHeadcount ? Math.round(analytics.summary.averageHeadcount) : personnel?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Average for {selectedYear}</p>
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
            {/* Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Type</CardTitle>
                <CardDescription>Distribution of costs across employee types</CardDescription>
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
                        dataKey="monthlyCost"
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

            {/* Position Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Position</CardTitle>
                <CardDescription>Top positions by monthly cost</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.positionBreakdown && analytics.positionBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={analytics.positionBreakdown.slice(0, 8)}
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

          {/* Top Positions */}
          {analytics?.topPositions && analytics.topPositions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Positions by Cost</CardTitle>
                <CardDescription>Highest cost positions in your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topPositions.map((pos, idx) => (
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
              {analyticsLoading ? (
                <div className="h-[400px] flex items-center justify-center">Loading...</div>
              ) : analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={analytics.monthlyTrend}>
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
                      strokeWidth={3}
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

          {/* Cost Trend Only */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Cost Trend</CardTitle>
              <CardDescription>Personnel cost evolution over {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[300px] flex items-center justify-center">Loading...</div>
              ) : analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#8884d8" 
                      fillOpacity={1} 
                      fill="url(#colorCost)" 
                      name="Monthly Cost"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Type Details */}
            <Card>
              <CardHeader>
                <CardTitle>Type Breakdown Details</CardTitle>
                <CardDescription>Detailed breakdown by employee type</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.typeBreakdown && analytics.typeBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {[...analytics.typeBreakdown]
                      .sort((a, b) => b.monthlyCost - a.monthlyCost)
                      .map((type, idx) => (
                        <div key={type.type} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">{type.type.replace('_', ' ')}</span>
                            <span className="text-muted-foreground">{type.count} employees</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${type.percentage}%`,
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(type.monthlyCost)}/month</span>
                            <span>{type.percentage.toFixed(1)}%</span>
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

            {/* Headcount by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Headcount by Type</CardTitle>
                <CardDescription>Number of employees by type</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">Loading...</div>
                ) : analytics?.typeBreakdown && analytics.typeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.typeBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#22c55e" name="Headcount" />
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

        <TabsContent value="table" className="space-y-4">
          <div className="-mx-4">
            <DataTablePage
              title=""
              description=""
              createHref="/personnel/create"
            data={personnel || []}
            columns={columns}
            loading={isLoading}
            onRowClick={(person) => router.push(`/personnel/${person.id}`)}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleBulkCopy}
            onBulkExport={handleBulkExport}
            filterColumns={[
              { value: "type", label: "Type" },
              { value: "isActive", label: "Status" },
            ]}
            sortColumns={[
              { value: "firstName", label: "Name", type: "character varying" },
              { value: "baseSalary", label: "Base Salary", type: "numeric" },
              { value: "startDate", label: "Start Date", type: "date" },
            ]}
            localStoragePrefix="personnel"
            searchFields={["firstName", "lastName", "email", "position"]}
          />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

