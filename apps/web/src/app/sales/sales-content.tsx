"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useSales, useDeleteSale } from "@kit/hooks";
import type { Sale, SalesType } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function SalesContent() {
  const router = useRouter();
  const { data: sales, isLoading } = useSales();
  const deleteMutation = useDeleteSale();

  const columns: ColumnDef<Sale>[] = useMemo(() => [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        const typeLabels: Record<SalesType, string> = {
          on_site: "On Site",
          delivery: "Delivery",
          takeaway: "Takeaway",
          catering: "Catering",
          other: "Other",
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
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ row }) => row.original.quantity || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || <span className="text-muted-foreground">—</span>,
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this sale?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Sale deleted successfully");
    } catch (error) {
      toast.error("Failed to delete sale");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} sale(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} sale(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete sales");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Sale[], type: 'selected' | 'all') => {
    const salesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Date', 'Type', 'Amount', 'Quantity', 'Description'].join(','),
      ...salesToCopy.map(sale => [
        sale.date,
        sale.type,
        sale.amount,
        sale.quantity || '',
        sale.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${salesToCopy.length} sale(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Sale[], type: 'selected' | 'all') => {
    const salesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Date', 'Type', 'Amount', 'Quantity', 'Description'].join(','),
      ...salesToExport.map(sale => [
        sale.date,
        sale.type,
        sale.amount,
        sale.quantity || '',
        sale.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${salesToExport.length} sale(s) exported`);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your sales performance and revenue
          </p>
        </div>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/sales/create"
          data={sales || []}
          columns={columns}
          loading={isLoading}
          onRowClick={(sale) => router.push(`/sales/${sale.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "type", label: "Type" },
          ]}
          sortColumns={[
            { value: "date", label: "Date", type: "date" },
            { value: "amount", label: "Amount", type: "numeric" },
          ]}
          localStoragePrefix="sales"
          searchFields={["description"]}
        />
      </div>
    </div>
  );
}

