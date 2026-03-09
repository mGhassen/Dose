"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useUnits, useDeleteUnit } from "@kit/hooks";
import type { Unit } from "@kit/lib/api/units";
import AppLayout from "@/components/app-layout";
import { toast } from "sonner";

export default function UnitsSettingsContent() {
  const router = useRouter();
  const { data: units, isLoading } = useUnits();
  const deleteMutation = useDeleteUnit();

  const columns: ColumnDef<Unit>[] = useMemo(
    () => [
      { accessorKey: "symbol", header: "Symbol", cell: ({ row }) => <span className="font-mono font-medium">{row.original.symbol}</span> },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "dimension", header: "Dimension", cell: ({ row }) => row.original.dimension || "other" },
      {
        accessorKey: "baseUnitId",
        header: "Base unit",
        cell: ({ row }) => {
          const u = row.original;
          if (!u.baseUnitId) return <span className="text-muted-foreground">— (base)</span>;
          const base = (units || []).find((x) => x.id === u.baseUnitId);
          return base ? base.symbol : u.baseUnitId;
        },
      },
      { accessorKey: "factorToBase", header: "Factor", cell: ({ row }) => Number(row.original.factorToBase) },
    ],
    [units]
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Unit deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete unit");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} unit(s) deleted`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete units");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground mt-2">Manage units and their relations (e.g. 1 kg = 1000 g)</p>
        </div>
        <DataTablePage
          title=""
          description=""
          createHref="/settings/units/create"
          data={units || []}
          columns={columns}
          loading={isLoading}
          onRowClick={(u) => router.push(`/settings/units/${u.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          filterColumns={[
            { value: "symbol", label: "Symbol" },
            { value: "name", label: "Name" },
            { value: "dimension", label: "Dimension", type: "select" },
            { value: "baseUnitId", label: "Base Unit", type: "select" },
            { value: "factorToBase", label: "Factor" },
          ]}
          sortColumns={[
            { value: "symbol", label: "Symbol", type: "character varying" },
            { value: "name", label: "Name", type: "character varying" },
            { value: "dimension", label: "Dimension", type: "character varying" },
            { value: "baseUnitId", label: "Base Unit", type: "numeric" },
            { value: "factorToBase", label: "Factor", type: "numeric" },
          ]}
          localStoragePrefix="settingsUnits"
          searchFields={["symbol", "name", "dimension"]}
        />
      </div>
    </AppLayout>
  );
}
