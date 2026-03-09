"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useInvestments, useDeleteInvestment, useMetadataEnum } from "@kit/hooks";
import type { Investment } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function InvestmentsContent() {
  const router = useRouter();
  const { data: investments, isLoading } = useInvestments();
  const deleteMutation = useDeleteInvestment();
  const { data: investmentTypeValues = [] } = useMetadataEnum("InvestmentType");
  const { data: depreciationMethodValues = [] } = useMetadataEnum("DepreciationMethod");
  const typeLabels: Record<string, string> = useMemo(
    () => Object.fromEntries(investmentTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [investmentTypeValues]
  );
  const methodLabels: Record<string, string> = useMemo(
    () => Object.fromEntries(depreciationMethodValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [depreciationMethodValues]
  );

  const columns: ColumnDef<Investment>[] = useMemo(() => [
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
      accessorKey: "purchaseDate",
      header: "Purchase Date",
      cell: ({ row }) => formatDate(row.original.purchaseDate),
    },
    {
      accessorKey: "usefulLifeMonths",
      header: "Useful Life",
      cell: ({ row }) => `${row.original.usefulLifeMonths} months`,
    },
    {
      accessorKey: "depreciationMethod",
      header: "Depreciation Method",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {methodLabels[row.original.depreciationMethod] || row.original.depreciationMethod}
        </span>
      ),
    },
    {
      accessorKey: "residualValue",
      header: "Residual Value",
      cell: ({ row }) => formatCurrency(row.original.residualValue),
    },
  ], [typeLabels, methodLabels]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Investment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete investment");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
      toast.success(`${ids.length} investment(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete investments");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Investment[], type: 'selected' | 'all') => {
    const investmentsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Amount', 'Purchase Date', 'Useful Life (Months)', 'Depreciation Method', 'Residual Value', 'Description'].join(','),
      ...investmentsToCopy.map(inv => [
        inv.name,
        inv.type,
        inv.amount,
        inv.purchaseDate,
        inv.usefulLifeMonths,
        inv.depreciationMethod,
        inv.residualValue,
        inv.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${investmentsToCopy.length} investment(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Investment[], type: 'selected' | 'all') => {
    const investmentsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Amount', 'Purchase Date', 'Useful Life (Months)', 'Depreciation Method', 'Residual Value', 'Description'].join(','),
      ...investmentsToExport.map(inv => [
        inv.name,
        inv.type,
        inv.amount,
        inv.purchaseDate,
        inv.usefulLifeMonths,
        inv.depreciationMethod,
        inv.residualValue,
        inv.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${investmentsToExport.length} investment(s) exported`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments & Assets</h1>
          <p className="text-muted-foreground mt-2">
            Track your capital investments, depreciation, and asset values
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
          title=""
          description=""
          createHref="/investments/create"
          data={investments || []}
          columns={columns}
          loading={isLoading}
          onRowClick={(investment) => router.push(`/investments/${investment.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "name", label: "Name" },
            { value: "type", label: "Type", type: "select" },
            { value: "amount", label: "Amount" },
            { value: "purchaseDate", label: "Purchase Date" },
            { value: "usefulLifeMonths", label: "Useful Life" },
            { value: "depreciationMethod", label: "Depreciation Method", type: "select" },
            { value: "residualValue", label: "Residual Value" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "type", label: "Type", type: "character varying" },
            { value: "amount", label: "Amount", type: "numeric" },
            { value: "purchaseDate", label: "Purchase Date", type: "date" },
            { value: "usefulLifeMonths", label: "Useful Life", type: "numeric" },
            { value: "depreciationMethod", label: "Depreciation Method", type: "character varying" },
            { value: "residualValue", label: "Residual Value", type: "numeric" },
          ]}
          localStoragePrefix="investments"
          searchFields={["name", "description"]}
        />
      </div>
    </div>
  );
}

