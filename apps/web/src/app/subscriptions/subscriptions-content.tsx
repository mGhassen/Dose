"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useSubscriptions, useDeleteSubscription, useInventorySuppliers, useMetadataEnum } from "@kit/hooks";
import Link from "next/link";
import type { Subscription } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { Button } from "@kit/ui/button";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { Calendar } from "lucide-react";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";

export default function SubscriptionsContent() {
  const router = useRouter();
  const { dateRange } = useDashboardPeriod();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: subscriptionsResponse, isLoading } = useSubscriptions({ page: 1, limit: 1000 });
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const suppliers = suppliersResponse?.data || [];
  const { data: categoryValues = [] } = useMetadataEnum("ExpenseCategory");
  const { data: recurrenceValues = [] } = useMetadataEnum("ExpenseRecurrence");
  const categoryLabels = useMemo(
    () => Object.fromEntries(categoryValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [categoryValues]
  );
  const recurrenceLabels = useMemo(
    () => Object.fromEntries(recurrenceValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [recurrenceValues]
  );

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptionsResponse?.data) return [];
    return subscriptionsResponse.data.filter(sub => {
      const start = sub.startDate;
      const end = sub.endDate;
      return start <= dateRange.endDate && (!end || end >= dateRange.startDate);
    });
  }, [subscriptionsResponse?.data, dateRange]);
  
  const paginatedSubscriptions = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredSubscriptions.slice(startIndex, startIndex + pageSize);
  }, [filteredSubscriptions, page, pageSize]);
  
  const totalPages = Math.ceil(filteredSubscriptions.length / pageSize);
  const deleteMutation = useDeleteSubscription();
  
  // Create a map of supplier IDs to suppliers for display
  const supplierMap = useMemo(() => {
    const map = new Map<number, typeof suppliers[0]>();
    if (suppliers && Array.isArray(suppliers)) {
      suppliers.forEach(supplier => map.set(supplier.id, supplier));
    }
    return map;
  }, [suppliers]);

  const columns: ColumnDef<Subscription>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusPin active={row.original.isActive} size="sm" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
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
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "recurrence",
      header: "Recurrence",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {recurrenceLabels[row.original.recurrence] ?? row.original.recurrence}
        </span>
      ),
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
      cell: ({ row }) => {
        const subscription = row.original;
        if (subscription.supplierId && supplierMap.has(subscription.supplierId)) {
          const supplier = supplierMap.get(subscription.supplierId)!;
          return (
            <Link
              href={`/inventory-suppliers/${subscription.supplierId}`}
              className="text-primary hover:underline"
            >
              {supplier.name}
            </Link>
          );
        }
        return subscription.vendor || <span className="text-muted-foreground">—</span>;
      },
    },
  ], [supplierMap, categoryLabels, recurrenceLabels]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Subscription deleted successfully");
    } catch (error) {
      toast.error("Failed to delete subscription");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} subscription(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete subscriptions");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Subscription[], type: 'selected' | 'all') => {
    const subscriptionsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Category', 'Amount', 'Recurrence', 'Start Date', 'End Date', 'Vendor', 'Description'].join(','),
      ...subscriptionsToCopy.map(sub => [
        sub.name,
        sub.category,
        sub.amount,
        sub.recurrence,
        sub.startDate,
        sub.endDate || '',
        sub.vendor || '',
        sub.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${subscriptionsToCopy.length} subscription(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Subscription[], type: 'selected' | 'all') => {
    const subscriptionsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Category', 'Amount', 'Recurrence', 'Start Date', 'End Date', 'Vendor', 'Description'].join(','),
      ...subscriptionsToExport.map(sub => [
        sub.name,
        sub.category,
        sub.amount,
        sub.recurrence,
        sub.startDate,
        sub.endDate || '',
        sub.vendor || '',
        sub.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${subscriptionsToExport.length} subscription(s) exported`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-muted-foreground mt-2">
              Manage recurring subscriptions and their timelines
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/subscriptions/timeline')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Timeline
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
          title=""
          description=""
          createHref="/subscriptions/create"
          data={paginatedSubscriptions}
          columns={columns}
          loading={isLoading}
          onRowClick={(subscription) => router.push(`/subscriptions/${subscription.id}`)}
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
          localStoragePrefix="subscriptions"
          searchFields={["name", "description", "vendor"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredSubscriptions.length,
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

