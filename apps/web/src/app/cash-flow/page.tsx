"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useCashFlowEntries, useDeleteCashFlowEntry } from "@kit/hooks";
import type { CashFlowEntry } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { toast } from "sonner";

export default function CashFlowPage() {
  const router = useRouter();
  const { data: cashFlow, isLoading } = useCashFlowEntries();
  const deleteMutation = useDeleteCashFlowEntry();

  const columns: ColumnDef<CashFlowEntry>[] = useMemo(() => [
    {
      accessorKey: "month",
      header: "Month",
      cell: ({ row }) => {
        const month = row.original.month;
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      },
    },
    {
      accessorKey: "openingBalance",
      header: "Opening Balance",
      cell: ({ row }) => formatCurrency(row.original.openingBalance),
    },
    {
      accessorKey: "cashInflows",
      header: "Inflows",
      cell: ({ row }) => (
        <span className="text-green-600 font-medium">
          {formatCurrency(row.original.cashInflows)}
        </span>
      ),
    },
    {
      accessorKey: "cashOutflows",
      header: "Outflows",
      cell: ({ row }) => (
        <span className="text-red-600 font-medium">
          {formatCurrency(row.original.cashOutflows)}
        </span>
      ),
    },
    {
      accessorKey: "netCashFlow",
      header: "Net Cash Flow",
      cell: ({ row }) => {
        const net = row.original.netCashFlow;
        return (
          <span className={net >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
            {formatCurrency(net)}
          </span>
        );
      },
    },
    {
      accessorKey: "closingBalance",
      header: "Closing Balance",
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.original.closingBalance)}
        </span>
      ),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this cash flow entry?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Cash flow entry deleted successfully");
    } catch (error) {
      toast.error("Failed to delete cash flow entry");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} cash flow entry(ies)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} cash flow entry(ies) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete cash flow entries");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: CashFlowEntry[], type: 'selected' | 'all') => {
    const entriesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Opening Balance', 'Cash Inflows', 'Cash Outflows', 'Net Cash Flow', 'Closing Balance', 'Notes'].join(','),
      ...entriesToCopy.map(entry => [
        entry.month,
        entry.openingBalance,
        entry.cashInflows,
        entry.cashOutflows,
        entry.netCashFlow,
        entry.closingBalance,
        entry.notes || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${entriesToCopy.length} cash flow entry(ies) copied to clipboard`);
  };

  const handleBulkExport = (data: CashFlowEntry[], type: 'selected' | 'all') => {
    const entriesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Opening Balance', 'Cash Inflows', 'Cash Outflows', 'Net Cash Flow', 'Closing Balance', 'Notes'].join(','),
      ...entriesToExport.map(entry => [
        entry.month,
        entry.openingBalance,
        entry.cashInflows,
        entry.cashOutflows,
        entry.netCashFlow,
        entry.closingBalance,
        entry.notes || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${entriesToExport.length} cash flow entry(ies) exported`);
  };

  return (
    <DataTablePage
      title="Cash Flow"
      description="Manage your cash flow and treasury"
      createHref="/cash-flow/create"
      data={cashFlow || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(entry) => router.push(`/cash-flow/${entry.id}`)}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onBulkCopy={handleBulkCopy}
      onBulkExport={handleBulkExport}
      sortColumns={[
        { value: "month", label: "Month", type: "character varying" },
        { value: "closingBalance", label: "Closing Balance", type: "numeric" },
      ]}
      localStoragePrefix="cash-flow"
      searchFields={["notes"]}
    />
  );
}

