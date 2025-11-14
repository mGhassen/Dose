"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useWorkingCapital, useDeleteWorkingCapital } from "@kit/hooks";
import type { WorkingCapital } from "@kit/types";
import { formatCurrency } from "@kit/lib/config";
import { toast } from "sonner";

export default function WorkingCapitalPage() {
  const router = useRouter();
  const { data: workingCapital, isLoading } = useWorkingCapital();
  const deleteMutation = useDeleteWorkingCapital();

  const columns: ColumnDef<WorkingCapital>[] = useMemo(() => [
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
      accessorKey: "accountsReceivable",
      header: "Accounts Receivable",
      cell: ({ row }) => formatCurrency(row.original.accountsReceivable),
    },
    {
      accessorKey: "inventory",
      header: "Inventory",
      cell: ({ row }) => formatCurrency(row.original.inventory),
    },
    {
      accessorKey: "accountsPayable",
      header: "Accounts Payable",
      cell: ({ row }) => formatCurrency(row.original.accountsPayable),
    },
    {
      accessorKey: "otherCurrentAssets",
      header: "Other Current Assets",
      cell: ({ row }) => formatCurrency(row.original.otherCurrentAssets),
    },
    {
      accessorKey: "otherCurrentLiabilities",
      header: "Other Current Liabilities",
      cell: ({ row }) => formatCurrency(row.original.otherCurrentLiabilities),
    },
    {
      accessorKey: "workingCapitalNeed",
      header: "Working Capital Need (BFR)",
      cell: ({ row }) => {
        const bfr = row.original.workingCapitalNeed;
        return (
          <span className={`font-semibold ${bfr >= 0 ? 'text-primary' : 'text-red-600'}`}>
            {formatCurrency(bfr)}
          </span>
        );
      },
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this working capital entry?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Working capital entry deleted successfully");
    } catch (error) {
      toast.error("Failed to delete working capital entry");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} working capital entry(ies)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} working capital entry(ies) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete working capital entries");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: WorkingCapital[], type: 'selected' | 'all') => {
    const entriesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Accounts Receivable', 'Inventory', 'Accounts Payable', 'Other Current Assets', 'Other Current Liabilities', 'Working Capital Need'].join(','),
      ...entriesToCopy.map(wc => [
        wc.month,
        wc.accountsReceivable,
        wc.inventory,
        wc.accountsPayable,
        wc.otherCurrentAssets,
        wc.otherCurrentLiabilities,
        wc.workingCapitalNeed,
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${entriesToCopy.length} working capital entry(ies) copied to clipboard`);
  };

  const handleBulkExport = (data: WorkingCapital[], type: 'selected' | 'all') => {
    const entriesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Accounts Receivable', 'Inventory', 'Accounts Payable', 'Other Current Assets', 'Other Current Liabilities', 'Working Capital Need'].join(','),
      ...entriesToExport.map(wc => [
        wc.month,
        wc.accountsReceivable,
        wc.inventory,
        wc.accountsPayable,
        wc.otherCurrentAssets,
        wc.otherCurrentLiabilities,
        wc.workingCapitalNeed,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `working-capital-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${entriesToExport.length} working capital entry(ies) exported`);
  };

  return (
    <DataTablePage
      title="Working Capital (BFR)"
      description="Manage your working capital and BFR (Besoin en Fonds de Roulement)"
      createHref="/working-capital/create"
      data={workingCapital || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(wc) => router.push(`/working-capital/${wc.id}`)}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onBulkCopy={handleBulkCopy}
      onBulkExport={handleBulkExport}
      sortColumns={[
        { value: "month", label: "Month", type: "character varying" },
        { value: "workingCapitalNeed", label: "Working Capital Need", type: "numeric" },
      ]}
      localStoragePrefix="working-capital"
      searchFields={[]}
    />
  );
}

