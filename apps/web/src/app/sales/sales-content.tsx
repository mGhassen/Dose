"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";
import { useSales, useDeleteSale, useMetadataEnum } from "@kit/hooks";
import type { Sale } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { PaidAmountCell } from "@/components/paid-amount-cell";
import { formatCurrency } from "@kit/lib/config";
import { formatDateTime } from "@kit/lib/date-format";
import { toast } from "sonner";

interface SalesContentProps {
  selectedSaleId?: number;
}

export default function SalesContent({ selectedSaleId }: SalesContentProps) {
  const router = useRouter();
  const { dateRange } = useDashboardPeriod();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [dateRange.startDate, dateRange.endDate]);

  const { data: salesResponse, isLoading } = useSales({
    page,
    limit: pageSize,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  
  const sales = salesResponse?.data || [];
  const totalCount = salesResponse?.pagination?.total || 0;
  const totalPages = salesResponse?.pagination?.totalPages || 0;
  const deleteMutation = useDeleteSale();
  const { data: salesTypeValues = [] } = useMetadataEnum("SalesType");
  const typeLabels: Record<string, string> = useMemo(
    () => Object.fromEntries(salesTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [salesTypeValues]
  );

  const columns: ColumnDef<Sale>[] = useMemo(() => [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDateTime(row.original.date),
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
      cell: ({ row }) => (
        <PaidAmountCell amount={row.original.amount} totalPaidAmount={row.original.totalPaidAmount} />
      ),
    },
    {
      accessorKey: "totalTax",
      header: "Total tax",
      cell: ({ row }) =>
        row.original.totalTax != null ? (
          formatCurrency(row.original.totalTax)
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || <span className="text-muted-foreground">—</span>,
    },
  ], [typeLabels]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Sale deleted successfully");
      if (selectedSaleId === id) router.push("/sales");
    } catch (error) {
      toast.error("Failed to delete sale");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
      toast.success(`${ids.length} sale(s) deleted successfully`);
      if (selectedSaleId !== undefined && ids.includes(selectedSaleId)) router.push("/sales");
    } catch (error) {
      toast.error("Failed to delete sales");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Sale[], type: 'selected' | 'all') => {
    const salesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Date', 'Type', 'Amount', 'Total tax', 'Description'].join(','),
      ...salesToCopy.map(sale => [
        sale.date,
        sale.type,
        sale.amount,
        sale.totalTax ?? '',
        sale.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${salesToCopy.length} sale(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Sale[], type: 'selected' | 'all') => {
    const salesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Date', 'Type', 'Amount', 'Total tax', 'Description'].join(','),
      ...salesToExport.map(sale => [
        sale.date,
        sale.type,
        sale.amount,
        sale.totalTax ?? '',
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your sales performance and revenue
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
          title=""
          description=""
          createHref="/sales/create"
          data={sales}
          columns={columns}
          loading={isLoading}
          onRowClick={(sale) => {
            if (sale.id !== selectedSaleId) {
              router.push(`/sales/${sale.id}`);
            }
          }}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          activeRowId={selectedSaleId}
          filterColumns={[
            { value: "date", label: "Date" },
            { value: "type", label: "Type", type: "select" },
            { value: "amount", label: "Amount" },
            { value: "totalTax", label: "Total tax" },
            { value: "description", label: "Description" },
          ]}
          sortColumns={[
            { value: "date", label: "Date", type: "date" },
            { value: "type", label: "Type", type: "character varying" },
            { value: "amount", label: "Amount", type: "numeric" },
            { value: "totalTax", label: "Total tax", type: "numeric" },
            { value: "description", label: "Description", type: "character varying" },
          ]}
          localStoragePrefix="sales"
          searchFields={["description"]}
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

