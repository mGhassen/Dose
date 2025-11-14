"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useFinancialPlan, useDeleteFinancialPlan } from "@kit/hooks";
import type { FinancialPlan } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { toast } from "sonner";

export default function FinancialPlanPage() {
  const router = useRouter();
  const { data: financialPlans, isLoading } = useFinancialPlan();
  const deleteMutation = useDeleteFinancialPlan();

  const columns: ColumnDef<FinancialPlan>[] = useMemo(() => [
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
      accessorKey: "totalSources",
      header: "Total Sources",
      cell: ({ row }) => (
        <span className="text-green-600 font-semibold">
          {formatCurrency(row.original.totalSources)}
        </span>
      ),
    },
    {
      accessorKey: "equity",
      header: "Equity",
      cell: ({ row }) => formatCurrency(row.original.equity),
    },
    {
      accessorKey: "loans",
      header: "Loans",
      cell: ({ row }) => formatCurrency(row.original.loans),
    },
    {
      accessorKey: "totalUses",
      header: "Total Uses",
      cell: ({ row }) => (
        <span className="text-red-600 font-semibold">
          {formatCurrency(row.original.totalUses)}
        </span>
      ),
    },
    {
      accessorKey: "investments",
      header: "Investments",
      cell: ({ row }) => formatCurrency(row.original.investments),
    },
    {
      accessorKey: "workingCapital",
      header: "Working Capital",
      cell: ({ row }) => formatCurrency(row.original.workingCapital),
    },
    {
      accessorKey: "netFinancing",
      header: "Net Financing",
      cell: ({ row }) => {
        const net = row.original.netFinancing;
        return (
          <span className={`font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(net)}
          </span>
        );
      },
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this financial plan?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Financial plan deleted successfully");
    } catch (error) {
      toast.error("Failed to delete financial plan");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} financial plan(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} financial plan(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete financial plans");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: FinancialPlan[], type: 'selected' | 'all') => {
    const plansToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Equity', 'Loans', 'Other Sources', 'Total Sources', 'Investments', 'Working Capital', 'Loan Repayments', 'Other Uses', 'Total Uses', 'Net Financing'].join(','),
      ...plansToCopy.map(fp => [
        fp.month,
        fp.equity,
        fp.loans,
        fp.otherSources,
        fp.totalSources,
        fp.investments,
        fp.workingCapital,
        fp.loanRepayments,
        fp.otherUses,
        fp.totalUses,
        fp.netFinancing,
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${plansToCopy.length} financial plan(s) copied to clipboard`);
  };

  const handleBulkExport = (data: FinancialPlan[], type: 'selected' | 'all') => {
    const plansToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Month', 'Equity', 'Loans', 'Other Sources', 'Total Sources', 'Investments', 'Working Capital', 'Loan Repayments', 'Other Uses', 'Total Uses', 'Net Financing'].join(','),
      ...plansToExport.map(fp => [
        fp.month,
        fp.equity,
        fp.loans,
        fp.otherSources,
        fp.totalSources,
        fp.investments,
        fp.workingCapital,
        fp.loanRepayments,
        fp.otherUses,
        fp.totalUses,
        fp.netFinancing,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-plan-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${plansToExport.length} financial plan(s) exported`);
  };

  return (
    <DataTablePage
      title="Financial Plan"
      description="View and manage your financial plans (Plan de Financement)"
      createHref="/financial-plan/create"
      data={financialPlans || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(fp) => router.push(`/financial-plan/${fp.id}`)}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onBulkCopy={handleBulkCopy}
      onBulkExport={handleBulkExport}
      sortColumns={[
        { value: "month", label: "Month", type: "character varying" },
        { value: "netFinancing", label: "Net Financing", type: "numeric" },
      ]}
      localStoragePrefix="financial-plan"
      searchFields={[]}
    />
  );
}

