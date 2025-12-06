"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useExpiryDates, useDeleteExpiryDate, useItems } from "@kit/hooks";
import type { ExpiryDate } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function ExpiryDatesContent() {
  const router = useRouter();
  
  const { data: expiryDatesResponse, isLoading } = useExpiryDates({ 
    limit: 1000
  });
  
  const { data: itemsResponse } = useItems({ limit: 1000 });
  
  const itemMap = useMemo(() => {
    if (!itemsResponse?.data) return new Map<number, string>();
    return new Map(itemsResponse.data.filter(i => i.itemType === 'item').map(i => [i.id, i.name]));
  }, [itemsResponse?.data]);
  
  const filteredExpiryDates = useMemo(() => {
    if (!expiryDatesResponse?.data) return [];
    return expiryDatesResponse.data;
  }, [expiryDatesResponse?.data]);
  const deleteMutation = useDeleteExpiryDate();

  const columns: ColumnDef<ExpiryDate>[] = useMemo(() => [
    {
      accessorKey: "itemId",
      header: "Item",
      cell: ({ row }) => {
        const itemId = row.original.itemId || row.original.ingredientId;
        if (itemId && itemMap.has(itemId)) {
          return itemMap.get(itemId);
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ row }) => `${row.original.quantity} ${row.original.unit}`,
    },
    {
      accessorKey: "expiryDate",
      header: "Expiry Date",
      cell: ({ row }) => {
        const expiryDate = new Date(row.original.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isExpired = expiryDate < today;
        return (
          <div className="flex items-center gap-2">
            <span className={isExpired ? "text-red-600 font-semibold" : ""}>
              {formatDate(row.original.expiryDate)}
            </span>
            {isExpired && (
              <Badge variant="destructive">Expired</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => row.original.location || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "isExpired",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isExpired ? "destructive" : "default"}>
          {row.original.isExpired ? "Expired" : "Active"}
        </Badge>
      ),
    },
    {
      accessorKey: "disposedDate",
      header: "Disposed Date",
      cell: ({ row }) => row.original.disposedDate ? formatDate(row.original.disposedDate) : <span className="text-muted-foreground">—</span>,
    },
  ], [itemMap]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expiry date record?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Expiry date record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete expiry date record");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} expiry date record(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} expiry date record(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete expiry date records");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: ExpiryDate[], type: 'selected' | 'all') => {
    const expiryDatesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Ingredient', 'Quantity', 'Unit', 'Expiry Date', 'Location', 'Status', 'Disposed Date'].join(','),
      ...expiryDatesToCopy.map(expiry => [
        itemMap.get(expiry.itemId || expiry.ingredientId) || '',
        expiry.quantity,
        expiry.unit,
        expiry.expiryDate,
        expiry.location || '',
        expiry.isExpired ? 'Expired' : 'Active',
        expiry.disposedDate || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${expiryDatesToCopy.length} expiry date record(s) copied to clipboard`);
  };

  const handleBulkExport = (data: ExpiryDate[], type: 'selected' | 'all') => {
    const expiryDatesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Ingredient', 'Quantity', 'Unit', 'Expiry Date', 'Location', 'Status', 'Disposed Date'].join(','),
      ...expiryDatesToExport.map(expiry => [
        itemMap.get(expiry.itemId || expiry.ingredientId) || '',
        expiry.quantity,
        expiry.unit,
        expiry.expiryDate,
        expiry.location || '',
        expiry.isExpired ? 'Expired' : 'Active',
        expiry.disposedDate || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expiry-dates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${expiryDatesToExport.length} expiry date record(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expiry Dates</h1>
          <p className="text-muted-foreground mt-2">
            Track expiry dates for stock items
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/expiry-dates/create"
          data={filteredExpiryDates}
          columns={columns}
          loading={isLoading}
          onRowClick={(expiry) => router.push(`/expiry-dates/${expiry.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "isExpired", label: "Status" },
          ]}
          sortColumns={[
            { value: "expiryDate", label: "Expiry Date", type: "date" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="expiry-dates"
          searchFields={["location", "notes"]}
        />
      </div>
    </div>
  );
}

