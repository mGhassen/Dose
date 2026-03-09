"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useVariables, useDeleteVariable, useMetadataEnum } from "@kit/hooks";
import type { Variable } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

interface VariablesContentProps {
  selectedVariableId?: number;
}

export default function VariablesContent({ selectedVariableId }: VariablesContentProps) {
  const router = useRouter();
  const { data: variables, isLoading } = useVariables();
  const deleteMutation = useDeleteVariable();
  const { data: variableTypeValues = [] } = useMetadataEnum("VariableType");
  const typeLabels: Record<string, string> = useMemo(
    () => Object.fromEntries(variableTypeValues.map((ev) => [ev.name, ev.label ?? ev.name])),
    [variableTypeValues]
  );

  const columns: ColumnDef<Variable>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusPin active={row.original.isActive} size="sm" />
          <span className="font-medium">{row.original.name}</span>
        </div>
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
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => {
        const variable = row.original;
        if (variable.type === "unit") {
          const payload = variable.payload as { symbol?: string } | undefined;
          return payload?.symbol ?? "—";
        }
        if (!variable.unit) {
          return variable.value.toString();
        }
        const displayUnit = variable.unit === "percentage" ? "%" : variable.unit;
        return `${variable.value} ${displayUnit}`;
      },
    },
    {
      accessorKey: "effectiveDate",
      header: "Effective Date",
      cell: ({ row }) =>
        row.original.effectiveDate ? formatDate(row.original.effectiveDate) : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => 
        row.original.endDate ? formatDate(row.original.endDate) : <span className="text-muted-foreground">—</span>
    },
  ], [typeLabels]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Variable deleted successfully");
      if (selectedVariableId === id) router.push("/variables");
    } catch (error) {
      toast.error("Failed to delete variable");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
      toast.success(`${ids.length} variable(s) deleted successfully`);
      if (selectedVariableId !== undefined && ids.includes(selectedVariableId)) router.push("/variables");
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
        v.effectiveDate ?? '',
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
        v.effectiveDate ?? '',
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
      data={variables ?? []}
      columns={columns}
      loading={isLoading}
      activeRowId={selectedVariableId}
      onRowClick={(variable) => {
        if (variable.id !== selectedVariableId) router.push(`/variables/${variable.id}`);
      }}
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
    />
  );
}

