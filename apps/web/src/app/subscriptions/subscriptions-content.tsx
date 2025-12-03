"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useSubscriptions, useDeleteSubscription } from "@kit/hooks";
import { useYear } from "@/contexts/year-context";
import type { Subscription, ExpenseCategory, ExpenseRecurrence } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

export default function SubscriptionsContent() {
  const router = useRouter();
  const { selectedYear } = useYear();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: subscriptionsResponse, isLoading } = useSubscriptions({ 
    page, 
    limit: 1000 // Fetch all for year filtering, then paginate client-side
  });
  
  // Filter by year (subscriptions active in the selected year) and paginate client-side
  const filteredSubscriptions = useMemo(() => {
    if (!subscriptionsResponse?.data) return [];
    return subscriptionsResponse.data.filter(sub => {
      const startDate = sub.startDate;
      const endDate = sub.endDate;
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;
      
      // Include if started before or during the year and (no end date or ended after year start)
      return startDate <= yearEnd && (!endDate || endDate >= yearStart);
    });
  }, [subscriptionsResponse?.data, selectedYear]);
  
  const paginatedSubscriptions = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredSubscriptions.slice(startIndex, startIndex + pageSize);
  }, [filteredSubscriptions, page, pageSize]);
  
  const totalPages = Math.ceil(filteredSubscriptions.length / pageSize);
  const deleteMutation = useDeleteSubscription();

  const columns: ColumnDef<Subscription>[] = useMemo(() => [
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-2">
            Manage recurring subscriptions and their timelines
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/subscriptions/timeline')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Timeline
          </Button>
        </div>
      </div>

      {/* Table View */}
      <div className="-mx-4">
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

