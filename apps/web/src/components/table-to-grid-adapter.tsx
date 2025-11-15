"use client";

import { useMemo } from "react";
import GridView, { GridColumn, GridRow } from "./grid-view";
import type { ColumnDef } from "@tanstack/react-table";

interface TableToGridAdapterProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onRowAdd?: () => void;
  onRowDelete?: (rowId: string) => void;
  getRowId?: (row: T) => string;
}

export default function TableToGridAdapter<T extends Record<string, any>>({
  data,
  columns,
  onCellChange,
  onRowAdd,
  onRowDelete,
  getRowId,
}: TableToGridAdapterProps<T>) {
  const gridColumns: GridColumn[] = useMemo(() => {
    return columns.map((col, index) => {
      const accessorKey = (col as any).accessorKey || col.id || `col-${index}`;
      const header = typeof col.header === 'string' 
        ? col.header 
        : (col as any).header?.() || accessorKey;
      
      // Determine column type based on accessor key or cell renderer
      let type: 'text' | 'number' | 'currency' | 'date' = 'text';
      if (accessorKey.toLowerCase().includes('amount') || 
          accessorKey.toLowerCase().includes('price') ||
          accessorKey.toLowerCase().includes('cost')) {
        type = 'currency';
      } else if (accessorKey.toLowerCase().includes('date')) {
        type = 'date';
      } else if (col.cell && typeof col.cell === 'function') {
        // Try to infer from cell renderer
        const cellStr = col.cell.toString();
        if (cellStr.includes('formatCurrency') || cellStr.includes('currency')) {
          type = 'currency';
        } else if (cellStr.includes('formatDate') || cellStr.includes('date')) {
          type = 'date';
        }
      }

      return {
        id: accessorKey,
        label: header,
        type,
        width: 150,
        editable: type === 'text' || type === 'number' || type === 'currency',
      };
    });
  }, [columns]);

  const gridRows: GridRow[] = useMemo(() => {
    return data.map((row, index) => {
      const rowId = getRowId ? getRowId(row) : (row.id?.toString() || `row-${index}`);
      const rowData: Record<string, any> = {};
      
      columns.forEach((col) => {
        const accessorKey = (col as any).accessorKey || col.id;
        if (accessorKey) {
          // Handle nested accessors (e.g., "user.name")
          const keys = accessorKey.split('.');
          let value: any = row;
          for (const key of keys) {
            value = value?.[key];
          }
          rowData[accessorKey] = value ?? "";
        }
      });

      return {
        id: rowId,
        label: row.name || row.title || rowId,
        level: 0,
        data: rowData,
      };
    });
  }, [data, columns, getRowId]);

  return (
    <GridView
      columns={gridColumns}
      rows={gridRows}
      onCellChange={onCellChange}
      onRowAdd={onRowAdd}
      onRowDelete={onRowDelete}
      frozenColumns={1}
      defaultColumnWidth={150}
    />
  );
}

