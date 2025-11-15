"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useLeasing, useDeleteLeasing } from "@kit/hooks";
import type { LeasingPayment, LeasingType, ExpenseRecurrence } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

export default function LeasingContent() {
  const router = useRouter();
  const { data: leasing, isLoading } = useLeasing();
  const deleteMutation = useDeleteLeasing();

  const columns: ColumnDef<LeasingPayment>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        const typeLabels: Record<LeasingType, string> = {
          operating: "Operating",
          finance: "Finance",
        };
        return (
          <Badge variant="outline">
            {typeLabels[type] || type}
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
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => {
        const frequency = row.original.frequency;
        const frequencyLabels: Record<ExpenseRecurrence, string> = {
          one_time: "One Time",
          monthly: "Monthly",
          quarterly: "Quarterly",
          yearly: "Yearly",
          custom: "Custom",
        };
        return (
          <span className="text-sm text-muted-foreground">
            {frequencyLabels[frequency] || frequency}
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
      accessorKey: "lessor",
      header: "Lessor",
      cell: ({ row }) => row.original.lessor || <span className="text-muted-foreground">—</span>,
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
    if (!confirm("Are you sure you want to delete this leasing payment?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Leasing payment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete leasing payment");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} leasing payment(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} leasing payment(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete leasing payments");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: LeasingPayment[], type: 'selected' | 'all') => {
    const leasingToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Amount', 'Frequency', 'Start Date', 'End Date', 'Lessor', 'Description'].join(','),
      ...leasingToCopy.map(lease => [
        lease.name,
        lease.type,
        lease.amount,
        lease.frequency,
        lease.startDate,
        lease.endDate || '',
        lease.lessor || '',
        lease.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${leasingToCopy.length} leasing payment(s) copied to clipboard`);
  };

  const handleBulkExport = (data: LeasingPayment[], type: 'selected' | 'all') => {
    const leasingToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Amount', 'Frequency', 'Start Date', 'End Date', 'Lessor', 'Description'].join(','),
      ...leasingToExport.map(lease => [
        lease.name,
        lease.type,
        lease.amount,
        lease.frequency,
        lease.startDate,
        lease.endDate || '',
        lease.lessor || '',
        lease.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leasing-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${leasingToExport.length} leasing payment(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leasing Payments</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your leasing and rental obligations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/leasing/timeline')}
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
          createHref="/leasing/create"
          data={leasing || []}
          columns={columns}
          loading={isLoading}
          onRowClick={(lease) => router.push(`/leasing/${lease.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "type", label: "Type" },
            { value: "frequency", label: "Frequency" },
            { value: "isActive", label: "Status" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "amount", label: "Amount", type: "numeric" },
            { value: "startDate", label: "Start Date", type: "date" },
          ]}
          localStoragePrefix="leasing"
          searchFields={["name", "description", "lessor"]}
        />
      </div>
    </div>
  );
}

