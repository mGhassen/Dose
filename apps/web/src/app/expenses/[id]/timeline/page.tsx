"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { ArrowLeft, Calendar, TrendingUp, Download } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useExpenseById, useExpenseProjections } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { projectExpense } from "@/lib/calculations/expense-projections";
import type { ExpenseProjection } from "@kit/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";

interface ExpenseTimelinePageProps {
  params: Promise<{ id: string }>;
}

export default function ExpenseTimelinePage({ params }: ExpenseTimelinePageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: expense, isLoading: expenseLoading } = useExpenseById(resolvedParams?.id || "");
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [projections, setProjections] = useState<ExpenseProjection[]>([]);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (expense && startMonth && endMonth) {
      const proj = projectExpense(expense, startMonth, endMonth);
      setProjections(proj);
    }
  }, [expense, startMonth, endMonth]);

  const handleExport = () => {
    if (!expense || projections.length === 0) {
      toast.error("No timeline data to export");
      return;
    }

    const csv = [
      ['Month', 'Expense Name', 'Category', 'Amount', 'Status'].join(','),
      ...projections.map(proj => [
        proj.month,
        proj.expenseName,
        proj.category,
        proj.amount,
        proj.isProjected ? 'Projected' : 'Actual',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-timeline-${expense.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timeline exported successfully");
  };

  if (expenseLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!expense) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Expense Not Found</h1>
            <p className="text-muted-foreground">The expense you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/expenses')}>Back to Expenses</Button>
        </div>
      </AppLayout>
    );
  }

  const recurrenceLabels: Record<string, string> = {
    one_time: "One Time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    custom: "Custom",
  };

  const categoryLabels: Record<string, string> = {
    rent: "Rent",
    utilities: "Utilities",
    supplies: "Supplies",
    marketing: "Marketing",
    insurance: "Insurance",
    maintenance: "Maintenance",
    professional_services: "Professional Services",
    other: "Other",
  };

  const totalAmount = projections.reduce((sum, p) => sum + p.amount, 0);
  const actualCount = projections.filter(p => !p.isProjected).length;
  const projectedCount = projections.filter(p => p.isProjected).length;

  // Group by month for visualization
  const monthlyTotals: Record<string, number> = {};
  projections.forEach(p => {
    monthlyTotals[p.month] = (monthlyTotals[p.month] || 0) + p.amount;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Expense Timeline</h1>
            <p className="text-muted-foreground">
              {expense.name} - Evolution over time
            </p>
          </div>
          <div className="flex space-x-2">
            {projections.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push(`/expenses/${resolvedParams.id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Expense
            </Button>
          </div>
        </div>

        {/* Expense Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-base font-semibold mt-1">{expense.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-base mt-1">{categoryLabels[expense.category] || expense.category}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="text-base font-semibold mt-1">{formatCurrency(expense.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Recurrence</label>
                <p className="text-base mt-1">{recurrenceLabels[expense.recurrence] || expense.recurrence}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p className="text-base mt-1">{formatDate(expense.startDate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">End Date</label>
                <p className="text-base mt-1">{expense.endDate ? formatDate(expense.endDate) : "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={expense.isActive ? "default" : "secondary"} className="mt-1">
                  {expense.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline Range</CardTitle>
            <CardDescription>Select the date range to view the expense timeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startMonth">Start Month</Label>
                <Input
                  id="startMonth"
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endMonth">End Month</Label>
                <Input
                  id="endMonth"
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Statistics */}
        {projections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Timeline Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Occurrences</label>
                  <p className="text-2xl font-bold mt-1">{projections.length}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Actual Occurrences</label>
                  <p className="text-2xl font-bold mt-1 text-green-600">{actualCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Projected Occurrences</label>
                  <p className="text-2xl font-bold mt-1 text-blue-600">{projectedCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                  <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline Table */}
        {projections.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Timeline Evolution</CardTitle>
              <CardDescription>
                Detailed breakdown of expense occurrences over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projections.map((proj, index) => {
                      const [year, month] = proj.month.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                      return (
                        <TableRow key={`${proj.month}-${index}`}>
                          <TableCell className="font-medium">
                            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          </TableCell>
                          <TableCell>
                            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(proj.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {categoryLabels[proj.category] || proj.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={proj.isProjected ? "secondary" : "default"}>
                              {proj.isProjected ? "Projected" : "Actual"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-semibold bg-muted">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell>{formatCurrency(totalAmount)}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No timeline data available for the selected period.
                  {!expense.isActive && " This expense is inactive."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Summary Chart */}
        {Object.keys(monthlyTotals).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>Total expense amount per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(monthlyTotals)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, total]) => {
                    const [year, monthNum] = month.split('-');
                    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                    const isFuture = date > new Date();
                    return (
                      <div key={month} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          </span>
                          {isFuture && (
                            <Badge variant="secondary" className="text-xs">Projected</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-lg">{formatCurrency(total)}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

