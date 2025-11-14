"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useVariables, useDeleteVariable } from "@kit/hooks";
import type { Variable, VariableType } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function VariablesContent() {
  const router = useRouter();
  const { data: variables, isLoading } = useVariables();
  const deleteMutation = useDeleteVariable();

  const columns: ColumnDef<Variable>[] = useMemo(() => [
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
        const typeLabels: Record<VariableType, string> = {
          cost: "Cost",
          tax: "Tax",
          inflation: "Inflation",
          exchange_rate: "Exchange Rate",
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
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => {
        const variable = row.original;
        return variable.unit 
          ? `${variable.value} ${variable.unit}`
          : variable.value.toString();
      },
    },
    {
      accessorKey: "effectiveDate",
      header: "Effective Date",
      cell: ({ row }) => formatDate(row.original.effectiveDate),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => 
        row.original.endDate ? formatDate(row.original.endDate) : <span className="text-muted-foreground">—</span>
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this variable?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Variable deleted successfully");
    } catch (error) {
      toast.error("Failed to delete variable");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} variable(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} variable(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete variables");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Variable[], type: 'selected' | 'all') => {
    const variablesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Value', 'Unit', 'Effective Date', 'End Date', 'Description'].join(','),
      ...variablesToCopy.map(v => [
        v.name,
        v.type,
        v.value,
        v.unit || '',
        v.effectiveDate,
        v.endDate || '',
        v.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${variablesToCopy.length} variable(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Variable[], type: 'selected' | 'all') => {
    const variablesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Type', 'Value', 'Unit', 'Effective Date', 'End Date', 'Description'].join(','),
      ...variablesToExport.map(v => [
        v.name,
        v.type,
        v.value,
        v.unit || '',
        v.effectiveDate,
        v.endDate || '',
        v.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variables-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${variablesToExport.length} variable(s) exported`);
  };

  return (
    <DataTablePage
      title="Variables"
      description="Manage financial variables (costs, taxes, inflation, etc.)"
      createHref="/variables/create"
      data={variables || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(variable) => router.push(`/variables/${variable.id}`)}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onBulkCopy={handleBulkCopy}
      onBulkExport={handleBulkExport}
      filterColumns={[
        { value: "type", label: "Type" },
        { value: "isActive", label: "Status" },
      ]}
      sortColumns={[
        { value: "name", label: "Name", type: "character varying" },
        { value: "value", label: "Value", type: "numeric" },
        { value: "effectiveDate", label: "Effective Date", type: "date" },
      ]}
      localStoragePrefix="variables"
      searchFields={["name", "description"]}
      filterOptions={[
        {
          key: "type",
          label: "Type",
          type: "select",
          options: [
            { value: "cost", label: "Cost" },
            { value: "tax", label: "Tax" },
            { value: "inflation", label: "Inflation" },
            { value: "exchange_rate", label: "Exchange Rate" },
            { value: "other", label: "Other" },
          ],
        },
        {
          key: "isActive",
          label: "Status",
          type: "select",
          options: [
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ],
        },
      ]}
    />
  );
}

