"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useLeasing, useDeleteLeasing, useInventorySuppliers, useMetadataEnum } from "@kit/hooks";
import Link from "next/link";
import type { LeasingPayment } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { Button } from "@kit/ui/button";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

export default function LeasingContent() {
  const router = useRouter();
  const { data: leasing, isLoading } = useLeasing();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const suppliers = suppliersResponse?.data || [];
  const deleteMutation = useDeleteLeasing();
  const { data: leasingTypeValues = [] } = useMetadataEnum("LeasingType");
  const { data: recurrenceValues = [] } = useMetadataEnum("ExpenseRecurrence");
  const typeLabels: Record<string, string> = useMemo(
    () => Object.fromEntries(leasingTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [leasingTypeValues]
  );
  const frequencyLabels: Record<string, string> = useMemo(
    () => Object.fromEntries(recurrenceValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [recurrenceValues]
  );

  const supplierMap = useMemo(() => {
    const map = new Map<number, typeof suppliers[0]>();
    if (suppliers && Array.isArray(suppliers)) {
      suppliers.forEach(supplier => map.set(supplier.id, supplier));
    }
    return map;
  }, [suppliers]);

  const columns: ColumnDef<LeasingPayment>[] = useMemo(() => [
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
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {typeLabels[row.original.type] || row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {frequencyLabels[row.original.frequency] || row.original.frequency}
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
      accessorKey: "lessor",
      header: "Lessor",
      cell: ({ row }) => {
        const leasingPayment = row.original;
        if (leasingPayment.supplierId && supplierMap.has(leasingPayment.supplierId)) {
          const supplier = supplierMap.get(leasingPayment.supplierId)!;
          return (
            <Link
              href={`/inventory-suppliers/${leasingPayment.supplierId}`}
              className="text-primary hover:underline"
            >
              {supplier.name}
            </Link>
          );
        }
        return leasingPayment.lessor || <span className="text-muted-foreground">—</span>;
      },
    },
  ], [supplierMap, typeLabels, frequencyLabels]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Leasing payment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete leasing payment");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between pb-4">
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

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
            { value: "name", label: "Name" },
            { value: "type", label: "Type", type: "select" },
            { value: "amount", label: "Amount" },
            { value: "frequency", label: "Frequency", type: "select" },
            { value: "startDate", label: "Start Date" },
            { value: "endDate", label: "End Date" },
            { value: "lessor", label: "Lessor" },
            { value: "isActive", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "type", label: "Type", type: "character varying" },
            { value: "amount", label: "Amount", type: "numeric" },
            { value: "frequency", label: "Frequency", type: "character varying" },
            { value: "startDate", label: "Start Date", type: "date" },
            { value: "endDate", label: "End Date", type: "date" },
            { value: "lessor", label: "Lessor", type: "character varying" },
          ]}
          localStoragePrefix="leasing"
          searchFields={["name", "description", "lessor"]}
        />
      </div>
    </div>
  );
}

