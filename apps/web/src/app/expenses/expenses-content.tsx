"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useExpenses, useDeleteExpense, useSubscriptions, useInventorySuppliers, useMetadataEnum } from "@kit/hooks";
import Link from "next/link";
import type { Expense } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { PaidAmountCell } from "@/components/paid-amount-cell";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";

interface ExpensesContentProps {
  selectedExpenseId?: number;
}

type ExpenseReconciliationStatus = "reconciled" | "partial" | "unreconciled";

function getExpenseReconciliationStatus(expense: Expense): ExpenseReconciliationStatus {
  const paymentCount = expense.paymentCount ?? 0;
  const reconciledPaymentCount = expense.reconciledPaymentCount ?? 0;

  if (paymentCount > 0 && reconciledPaymentCount === paymentCount) return "reconciled";
  if (reconciledPaymentCount > 0) return "partial";
  return "unreconciled";
}

const reconciliationStatusDotClass: Record<ExpenseReconciliationStatus, string> = {
  reconciled: "bg-green-500",
  partial: "bg-yellow-500",
  unreconciled: "bg-red-500",
};

const reconciliationStatusLabel: Record<ExpenseReconciliationStatus, string> = {
  reconciled: "Fully reconciled",
  partial: "Partially reconciled",
  unreconciled: "Not reconciled",
};

export default function ExpensesContent({ selectedExpenseId }: ExpensesContentProps) {
  const router = useRouter();
  const { dateRange } = useDashboardPeriod();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
  const { data: categoryValues = [] } = useMetadataEnum("ExpenseCategory");
  const categoryLabels = useMemo(
    () => Object.fromEntries(categoryValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [categoryValues]
  );

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
      cell: ({ row }) => {
        const status = getExpenseReconciliationStatus(row.original);
        return (
          <div className="flex items-center gap-2 font-medium">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${reconciliationStatusDotClass[status]}`}
              title={reconciliationStatusLabel[status]}
              aria-label={reconciliationStatusLabel[status]}
            />
            <span>{row.original.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">
          {categoryLabels[row.original.category] ?? row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <PaidAmountCell amount={row.original.amount} totalPaidAmount={row.original.totalPaidAmount} />
      ),
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
  ], [subscriptionMap, supplierMap, categoryLabels]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Expense deleted successfully");
      if (selectedExpenseId === id) router.push("/expenses");
    } catch (error) {
      toast.error("Failed to delete expense");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} expense(s) deleted successfully`);
      if (selectedExpenseId !== undefined && ids.includes(selectedExpenseId)) router.push("/expenses");
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
                { value: "name", label: "Name" },
                { value: "category", label: "Category", type: "select", options: categoryValues.map((ev) => ({ value: ev.name, label: ev.label ?? ev.name })) },
                { value: "amount", label: "Amount" },
                { value: "subscriptionId", label: "Subscription", type: "select", options: subscriptions.map((sub) => ({ value: String(sub.id), label: sub.name })) },
                { value: "expenseDate", label: "Expense Date" },
                { value: "vendor", label: "Vendor" },
              ]}
              sortColumns={[
                { value: "name", label: "Name", type: "character varying" },
                { value: "category", label: "Category", type: "character varying" },
                { value: "amount", label: "Amount", type: "numeric" },
                { value: "expenseDate", label: "Expense Date", type: "date" },
                { value: "vendor", label: "Vendor", type: "character varying" },
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

