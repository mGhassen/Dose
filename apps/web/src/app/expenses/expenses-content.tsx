"use client";

import { useMemo } from "react";
import { useYear } from "@/contexts/year-context";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useExpenses, useDeleteExpense } from "@kit/hooks";
import type { Expense, ExpenseCategory, ExpenseRecurrence } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Calendar } from "lucide-react";

export default function ExpensesContent() {
  const router = useRouter();
  const { selectedYear } = useYear();
  const { data: expenses, isLoading } = useExpenses();
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
              Monthly total
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

      {/* Table View */}
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
    </div>
  );
}
