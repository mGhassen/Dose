"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import {
  useMetadataEnums,
  useDeleteMetadataEnum,
} from "@kit/hooks";
import type { MetadataEnum } from "@kit/lib/api/metadata-enums";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function MetadataEnumsContent() {
  const router = useRouter();
  const { data: enums, isLoading } = useMetadataEnums();
  const deleteMutation = useDeleteMetadataEnum();

  const columns: ColumnDef<MetadataEnum>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Enum Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: "label",
        header: "Label",
        cell: ({ row }) => <div>{row.original.label}</div>,
      },
      {
        accessorKey: "valueCount",
        header: "Values",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.valueCount || 0}</Badge>
        ),
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
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
    ],
    []
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Enum deleted successfully");
    } catch (error) {
      toast.error("Failed to delete enum");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} enum(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete enums");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: MetadataEnum[], type: 'selected' | 'all') => {
    const enumsToCopy = type === 'selected' ? data : data;

    const csv = [
      ['Name', 'Label', 'Description', 'Status', 'Value Count', 'Created', 'Updated'].join(','),
      ...enumsToCopy.map(e => [
        e.name,
        e.label,
        e.description || '',
        e.isActive ? 'Active' : 'Inactive',
        e.valueCount || 0,
        e.createdAt,
        e.updatedAt,
      ].join(','))
    ].join('\n');

    navigator.clipboard.writeText(csv);
    toast.success(`${enumsToCopy.length} enum(s) copied to clipboard`);
  };

  const handleBulkExport = (data: MetadataEnum[], type: 'selected' | 'all') => {
    const enumsToExport = type === 'selected' ? data : data;

    const csv = [
      ['Name', 'Label', 'Description', 'Status', 'Value Count', 'Created', 'Updated'].join(','),
      ...enumsToExport.map(e => [
        e.name,
        e.label,
        e.description || '',
        e.isActive ? 'Active' : 'Inactive',
        e.valueCount || 0,
        e.createdAt,
        e.updatedAt,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata-enums-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${enumsToExport.length} enum(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metadata Enums</h1>
          <p className="text-muted-foreground mt-2">
            Manage enum definitions and their values (categories, types, etc.)
          </p>
        </div>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/metadata-enums/create"
          data={enums || []}
          columns={columns}
          loading={isLoading}
          onRowClick={(enumItem) => router.push(`/metadata-enums/${enumItem.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "isActive", label: "Status" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "label", label: "Label", type: "character varying" },
          ]}
          localStoragePrefix="metadataEnums"
          searchFields={["name", "label", "description"]}
        />
      </div>
    </div>
  );
}
