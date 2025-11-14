"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useProfitLossStatements, useDeleteProfitLoss } from "@kit/hooks";
import type { ProfitAndLoss } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { toast } from "sonner";

export default function ProfitLossPage() {
  const router = useRouter();
  const { data: profitLoss, isLoading } = useProfitLossStatements();
  const deleteMutation = useDeleteProfitLoss();

  const columns: ColumnDef<ProfitAndLoss>[] = useMemo(() => [
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
      accessorKey: "totalRevenue",
      header: "Total Revenue",
      cell: ({ row }) => formatCurrency(row.original.totalRevenue),
    },
    {
      accessorKey: "costOfGoodsSold",
      header: "COGS",
      cell: ({ row }) => formatCurrency(row.original.costOfGoodsSold),
    },
    {
      accessorKey: "grossProfit",
      header: "Gross Profit",
      cell: ({ row }) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(row.original.grossProfit)}
        </span>
      ),
    },
    {
      accessorKey: "operatingExpenses",
      header: "Operating Expenses",
      cell: ({ row }) => formatCurrency(row.original.operatingExpenses),
    },
    {
      accessorKey: "personnelCosts",
      header: "Personnel Costs",
      cell: ({ row }) => formatCurrency(row.original.personnelCosts),
    },
    {
      accessorKey: "netProfit",
      header: "Net Profit",
      cell: ({ row }) => {
        const profit = row.original.netProfit;
        return (
          <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit)}
          </span>
        );
      },
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this profit & loss statement?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Profit & Loss statement deleted successfully");
    } catch (error) {
      toast.error("Failed to delete profit & loss statement");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} profit & loss statement(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} profit & loss statement(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete profit & loss statements");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: ProfitAndLoss[], type: 'selected' | 'all') => {
    const statementsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Total Revenue', 'COGS', 'Gross Profit', 'Operating Expenses', 'Personnel Costs', 'Leasing Costs', 'Depreciation', 'Interest Expense', 'Taxes', 'Other Expenses', 'Operating Profit', 'Net Profit'].join(','),
      ...statementsToCopy.map(pl => [
        pl.month,
        pl.totalRevenue,
        pl.costOfGoodsSold,
        pl.grossProfit,
        pl.operatingExpenses,
        pl.personnelCosts,
        pl.leasingCosts,
        pl.depreciation,
        pl.interestExpense,
        pl.taxes,
        pl.otherExpenses,
        pl.operatingProfit,
        pl.netProfit,
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${statementsToCopy.length} profit & loss statement(s) copied to clipboard`);
  };

  const handleBulkExport = (data: ProfitAndLoss[], type: 'selected' | 'all') => {
    const statementsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Total Revenue', 'COGS', 'Gross Profit', 'Operating Expenses', 'Personnel Costs', 'Leasing Costs', 'Depreciation', 'Interest Expense', 'Taxes', 'Other Expenses', 'Operating Profit', 'Net Profit'].join(','),
      ...statementsToExport.map(pl => [
        pl.month,
        pl.totalRevenue,
        pl.costOfGoodsSold,
        pl.grossProfit,
        pl.operatingExpenses,
        pl.personnelCosts,
        pl.leasingCosts,
        pl.depreciation,
        pl.interestExpense,
        pl.taxes,
        pl.otherExpenses,
        pl.operatingProfit,
        pl.netProfit,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${statementsToExport.length} profit & loss statement(s) exported`);
  };

  return (
    <DataTablePage
      title="Profit & Loss Statements"
      description="View and manage your profit and loss statements"
      data={profitLoss || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(pl) => router.push(`/profit-loss/${pl.month}`)}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onBulkCopy={handleBulkCopy}
      onBulkExport={handleBulkExport}
      sortColumns={[
        { value: "month", label: "Month", type: "character varying" },
        { value: "netProfit", label: "Net Profit", type: "numeric" },
      ]}
      localStoragePrefix="profit-loss"
      searchFields={[]}
    />
  );
}

