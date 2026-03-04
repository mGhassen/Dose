"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useExpenses, useDeleteExpense, useSubscriptions, useInventorySuppliers } from "@kit/hooks";
import Link from "next/link";
import { getDateRangeForPreset } from "@kit/lib/date-periods";
import { safeLocalStorage } from "@kit/lib/localStorage";
import type { Expense, ExpenseCategory } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { DashboardPeriodFilter } from "@/components/dashboard-period-filter";

const EXPENSES_PERIOD_KEY = "expenses-period";

function getInitialDateRange() {
  if (typeof window === "undefined") return getDateRangeForPreset("this_year");
  try {
    const saved = safeLocalStorage.getItem(EXPENSES_PERIOD_KEY);
    if (saved) {
      const { startDate, endDate } = JSON.parse(saved);
      if (startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return { startDate, endDate };
      }
    }
  } catch {
    /* ignore */
  }
  return getDateRangeForPreset("this_year");
}

interface ExpensesContentProps {
  selectedExpenseId?: number;
}

export default function ExpensesContent({ selectedExpenseId }: ExpensesContentProps) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleDateRangeChange = useCallback((range: { startDate: string; endDate: string }) => {
    setDateRange(range);
    safeLocalStorage.setItem(EXPENSES_PERIOD_KEY, JSON.stringify(range));
  }, []);

  const { data: expensesResponse, isLoading } = useExpenses({
    page,
    limit: pageSize,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  
  const { data: subscriptionsResponse } = useSubscriptions();
  const subscriptions = subscriptionsResponse?.data || [];
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const suppliers = suppliersResponse?.data || [];
  
  const expenses = expensesResponse?.data || [];
  const totalCount = expensesResponse?.pagination?.total || 0;
  const totalPages = expensesResponse?.pagination?.totalPages || 0;
  const deleteMutation = useDeleteExpense();
  
  // Create a map of subscription IDs to names for display
  const subscriptionMap = useMemo(() => {
    const map = new Map<number, string>();
    if (subscriptions && Array.isArray(subscriptions)) {
      subscriptions.forEach(sub => map.set(sub.id, sub.name));
    }
    return map;
  }, [subscriptions]);
  
  // Create a map of supplier IDs to suppliers for display
  const supplierMap = useMemo(() => {
    const map = new Map<number, typeof suppliers[0]>();
    if (suppliers && Array.isArray(suppliers)) {
      suppliers.forEach(supplier => map.set(supplier.id, supplier));
    }
    return map;
  }, [suppliers]);

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
      accessorKey: "subscriptionId",
      header: "Subscription",
      cell: ({ row }) => {
        const subscriptionId = row.original.subscriptionId;
        if (subscriptionId && subscriptionMap.has(subscriptionId)) {
          return (
            <Badge variant="outline">
              {subscriptionMap.get(subscriptionId)}
            </Badge>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "expenseDate",
      header: "Expense Date",
      cell: ({ row }) => formatDate(row.original.expenseDate),
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => {
        const expense = row.original;
        if (expense.supplierId && supplierMap.has(expense.supplierId)) {
          const supplier = supplierMap.get(expense.supplierId)!;
          return (
            <Link
              href={`/inventory-suppliers/${expense.supplierId}`}
              className="text-primary hover:underline"
            >
              {supplier.name}
            </Link>
          );
        }
        return expense.vendor || <span className="text-muted-foreground">—</span>;
      },
    },
  ], [subscriptionMap, supplierMap]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Expense deleted successfully");
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
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
      ['Name', 'Category', 'Amount', 'Subscription', 'Expense Date', 'Vendor', 'Description'].join(','),
      ...expensesToCopy.map(exp => [
        exp.name,
        exp.category,
        exp.amount,
        exp.subscriptionId ? subscriptionMap.get(exp.subscriptionId) || '' : '',
        exp.expenseDate,
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
      ['Name', 'Category', 'Amount', 'Subscription', 'Expense Date', 'Vendor', 'Description'].join(','),
      ...expensesToExport.map(exp => [
        exp.name,
        exp.category,
        exp.amount,
        exp.subscriptionId ? subscriptionMap.get(exp.subscriptionId) || '' : '',
        exp.expenseDate,
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


  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your business expenses and charges
          </p>
        </div>
        <DashboardPeriodFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
              title=""
              description=""
              createHref="/expenses/create"
              data={expenses}
              columns={columns}
              loading={isLoading}
              onRowClick={(expense) => {
              if (expense.id !== selectedExpenseId) {
                router.push(`/expenses/${expense.id}`);
              }
            }}
              activeRowId={selectedExpenseId}
              onDelete={handleDelete}
              onBulkDelete={handleBulkDelete}
              onBulkCopy={handleBulkCopy}
              onBulkExport={handleBulkExport}
              filterColumns={[
                { value: "category", label: "Category" },
                { value: "subscriptionId", label: "Subscription" },
              ]}
              sortColumns={[
                { value: "name", label: "Name", type: "character varying" },
                { value: "amount", label: "Amount", type: "numeric" },
                { value: "expenseDate", label: "Expense Date", type: "date" },
              ]}
              localStoragePrefix="expenses"
              searchFields={["name", "description", "vendor"]}
              pagination={{
                page,
                pageSize,
                totalCount,
                totalPages,
                onPageChange: setPage,
                onPageSizeChange: (newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                },
              }}
            />
      </div>
    </div>
  );
}

