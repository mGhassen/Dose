"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useInvestments, useDeleteInvestment } from "@kit/hooks";
import type { Investment, InvestmentType, DepreciationMethod } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function InvestmentsContent() {
  const router = useRouter();
  const { data: investments, isLoading } = useInvestments();
  const deleteMutation = useDeleteInvestment();

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
      cell: ({ row }) => {
        const type = row.original.type;
        const typeLabels: Record<InvestmentType, string> = {
          equipment: "Equipment",
          renovation: "Renovation",
          technology: "Technology",
          vehicle: "Vehicle",
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
      cell: ({ row }) => {
        const method = row.original.depreciationMethod;
        const methodLabels: Record<DepreciationMethod, string> = {
          straight_line: "Straight Line",
          declining_balance: "Declining Balance",
          units_of_production: "Units of Production",
        };
        return (
          <span className="text-sm text-muted-foreground">
            {methodLabels[method] || method}
          </span>
        );
      },
    },
    {
      accessorKey: "residualValue",
      header: "Residual Value",
      cell: ({ row }) => formatCurrency(row.original.residualValue),
    },
  ], []);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments & Assets</h1>
          <p className="text-muted-foreground mt-2">
            Track your capital investments, depreciation, and asset values
          </p>
        </div>
      </div>

      {/* Table View */}
      <div className="-mx-4">
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
            { value: "type", label: "Type" },
            { value: "depreciationMethod", label: "Depreciation Method" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "amount", label: "Amount", type: "numeric" },
            { value: "purchaseDate", label: "Purchase Date", type: "date" },
          ]}
          localStoragePrefix="investments"
          searchFields={["name", "description"]}
        />
      </div>
    </div>
  );
}

