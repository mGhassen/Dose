"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Calendar, TrendingUp, Download, Eye } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useExpenses, useExpenseProjections } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { projectExpense } from "@/lib/calculations/expense-projections";
import type { Expense, ExpenseProjection } from "@kit/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";

export default function ExpensesTimelinePage() {
  const router = useRouter();
  const { data: expenses, isLoading } = useExpenses();
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedExpense, setSelectedExpense] = useState<number | null>(null);

  // Calculate all projections
  const allProjections: Array<ExpenseProjection & { expense: Expense }> = [];
  if (expenses) {
    expenses.forEach(expense => {
      const proj = projectExpense(expense, startMonth, endMonth);
      proj.forEach(p => {
        allProjections.push({ ...p, expense });
      });
    });
  }

  // Group by expense
  const expenseProjections: Record<number, ExpenseProjection[]> = {};
  allProjections.forEach(proj => {
    if (!expenseProjections[proj.expenseId]) {
      expenseProjections[proj.expenseId] = [];
    }
    expenseProjections[proj.expenseId].push(proj);
  });

  // Monthly totals across all expenses
  const monthlyTotals: Record<string, number> = {};
  allProjections.forEach(proj => {
    monthlyTotals[proj.month] = (monthlyTotals[proj.month] || 0) + proj.amount;
  });

  const handleExport = () => {
    if (allProjections.length === 0) {
      toast.error("No timeline data to export");
      return;
    }

    const csv = [
      ['Expense Name', 'Month', 'Category', 'Amount', 'Status'].join(','),
      ...allProjections.map(proj => [
        proj.expenseName,
        proj.month,
        proj.category,
        proj.amount,
        proj.isProjected ? 'Projected' : 'Actual',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-timeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timeline exported successfully");
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

  const recurrenceLabels: Record<string, string> = {
    one_time: "One Time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    custom: "Custom",
  };

  const totalAmount = allProjections.reduce((sum, p) => sum + p.amount, 0);
  const activeExpenses = expenses?.filter(e => e.isActive) || [];

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses Timeline</h1>
          <p className="text-muted-foreground">View evolution of all expenses over time</p>
        </div>
        {allProjections.length > 0 && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Timeline Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Range</CardTitle>
          <CardDescription>Select the date range to view expense timelines</CardDescription>
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

      {/* Summary Statistics */}
      {allProjections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Active Expenses</label>
                <p className="text-2xl font-bold mt-1">{activeExpenses.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Occurrences</label>
                <p className="text-2xl font-bold mt-1">{allProjections.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Average per Month</label>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalAmount / Object.keys(monthlyTotals).length || 1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List with Timeline */}
      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      ) : expenses && expenses.length > 0 ? (
        <div className="space-y-4">
          {expenses.map(expense => {
            const projections = expenseProjections[expense.id] || [];
            const expenseTotal = projections.reduce((sum, p) => sum + p.amount, 0);
            const isExpanded = selectedExpense === expense.id;

            return (
              <Card key={expense.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2">
                        <span>{expense.name}</span>
                        <Badge variant="outline">{categoryLabels[expense.category] || expense.category}</Badge>
                        <Badge variant={expense.isActive ? "default" : "secondary"}>
                          {expense.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {recurrenceLabels[expense.recurrence] || expense.recurrence} • {formatCurrency(expense.amount)} per occurrence
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total in Period</p>
                        <p className="text-lg font-semibold">{formatCurrency(expenseTotal)}</p>
                        <p className="text-xs text-muted-foreground">{projections.length} occurrence(s)</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedExpense(isExpanded ? null : expense.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {isExpanded ? "Hide" : "View"} Timeline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/expenses/${expense.id}/timeline`)}
                      >
                        Detailed View
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && projections.length > 0 && (
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projections.map((proj, idx) => {
                            const [year, month] = proj.month.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                            return (
                              <TableRow key={`${proj.month}-${idx}`}>
                                <TableCell className="font-medium">
                                  {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {formatCurrency(proj.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={proj.isProjected ? "secondary" : "default"}>
                                    {proj.isProjected ? "Projected" : "Actual"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No expenses found.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary */}
      {Object.keys(monthlyTotals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>Total expenses across all categories per month</CardDescription>
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
                    <div key={month} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-lg">
                          {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        </span>
                        {isFuture && (
                          <Badge variant="secondary">Projected</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        <span className="font-bold text-xl text-primary">{formatCurrency(total)}</span>
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

