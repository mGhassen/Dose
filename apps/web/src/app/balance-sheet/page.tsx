"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useBalanceSheet, useDeleteBalanceSheet } from "@kit/hooks";
import type { BalanceSheet } from "@kit/types";
import { formatCurrency } from "@kit/lib/config";
import { toast } from "sonner";

export default function BalanceSheetPage() {
  const router = useRouter();
  const { data: balanceSheets, isLoading } = useBalanceSheet();
  const deleteMutation = useDeleteBalanceSheet();

  const columns: ColumnDef<BalanceSheet>[] = useMemo(() => [
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
      accessorKey: "totalAssets",
      header: "Total Assets",
      cell: ({ row }) => formatCurrency(row.original.totalAssets),
    },
    {
      accessorKey: "currentAssets",
      header: "Current Assets",
      cell: ({ row }) => formatCurrency(row.original.currentAssets),
    },
    {
      accessorKey: "fixedAssets",
      header: "Fixed Assets",
      cell: ({ row }) => formatCurrency(row.original.fixedAssets),
    },
    {
      accessorKey: "totalLiabilities",
      header: "Total Liabilities",
      cell: ({ row }) => formatCurrency(row.original.totalLiabilities),
    },
    {
      accessorKey: "currentLiabilities",
      header: "Current Liabilities",
      cell: ({ row }) => formatCurrency(row.original.currentLiabilities),
    },
    {
      accessorKey: "longTermDebt",
      header: "Long-term Debt",
      cell: ({ row }) => formatCurrency(row.original.longTermDebt),
    },
    {
      accessorKey: "totalEquity",
      header: "Total Equity",
      cell: ({ row }) => (
        <span className="font-semibold text-primary">
          {formatCurrency(row.original.totalEquity)}
        </span>
      ),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this balance sheet?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Balance sheet deleted successfully");
    } catch (error) {
      toast.error("Failed to delete balance sheet");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} balance sheet(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} balance sheet(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete balance sheets");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: BalanceSheet[], type: 'selected' | 'all') => {
    const sheetsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Current Assets', 'Fixed Assets', 'Intangible Assets', 'Total Assets', 'Current Liabilities', 'Long-term Debt', 'Total Liabilities', 'Share Capital', 'Retained Earnings', 'Total Equity'].join(','),
      ...sheetsToCopy.map(bs => [
        bs.month,
        bs.currentAssets,
        bs.fixedAssets,
        bs.intangibleAssets,
        bs.totalAssets,
        bs.currentLiabilities,
        bs.longTermDebt,
        bs.totalLiabilities,
        bs.shareCapital,
        bs.retainedEarnings,
        bs.totalEquity,
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${sheetsToCopy.length} balance sheet(s) copied to clipboard`);
  };

  const handleBulkExport = (data: BalanceSheet[], type: 'selected' | 'all') => {
    const sheetsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Current Assets', 'Fixed Assets', 'Intangible Assets', 'Total Assets', 'Current Liabilities', 'Long-term Debt', 'Total Liabilities', 'Share Capital', 'Retained Earnings', 'Total Equity'].join(','),
      ...sheetsToExport.map(bs => [
        bs.month,
        bs.currentAssets,
        bs.fixedAssets,
        bs.intangibleAssets,
        bs.totalAssets,
        bs.currentLiabilities,
        bs.longTermDebt,
        bs.totalLiabilities,
        bs.shareCapital,
        bs.retainedEarnings,
        bs.totalEquity,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${sheetsToExport.length} balance sheet(s) exported`);
  };

  return (
    <DataTablePage
      title="Balance Sheet"
      description="View and manage your balance sheets"
      data={balanceSheets || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(bs) => router.push(`/balance-sheet/${bs.month}`)}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onBulkCopy={handleBulkCopy}
      onBulkExport={handleBulkExport}
      sortColumns={[
        { value: "month", label: "Month", type: "character varying" },
        { value: "totalAssets", label: "Total Assets", type: "numeric" },
      ]}
      localStoragePrefix="balance-sheet"
      searchFields={[]}
    />
  );
}

