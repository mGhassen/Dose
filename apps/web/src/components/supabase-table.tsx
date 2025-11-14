"use client";

import { useState } from "react";
import { Button } from "@smartlogbook/ui/button";
import { Checkbox } from "@smartlogbook/ui/checkbox";
import { 
  ChevronDown,
  ExternalLink,
  MoreHorizontal
} from "lucide-react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

interface SupabaseTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
}

export function SupabaseTable<T>({ data, columns, loading }: SupabaseTableProps<T>) {
  const [rowSelection, setRowSelection] = useState({});

  // Add selection column
  const tableColumns: ColumnDef<T>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-border"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-border"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...columns,
  ];

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-sm font-medium text-muted-foreground border-r border-border last:border-r-0"
                >
                  {header.isPlaceholder ? null : (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-foreground">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {(header.column.columnDef.meta as any)?.type && (
                          <span className="text-xs text-muted-foreground">
                            {(header.column.columnDef.meta as any).type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-card">
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              className={`border-b border-border hover:bg-muted/50 ${
                index % 2 === 0 ? "bg-card" : "bg-muted/20"
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 text-sm text-foreground border-r border-border last:border-r-0"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
