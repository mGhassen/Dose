"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  X, 
  GripVertical,
  MoreHorizontal,
  Trash2,
  Edit,
  Save,
  Columns
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { formatCurrency } from "@kit/lib/config";

export interface GridColumn {
  id: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'select';
  width?: number;
  editable?: boolean;
  formula?: (row: GridRow, allRows: GridRow[]) => number | string;
}

export interface GridRow {
  id: string;
  label: string;
  level?: number; // For hierarchical rows (0 = root, 1 = child, etc.)
  parentId?: string;
  isGroup?: boolean; // If true, this is a group header (collapsible)
  data: Record<string, any>;
  children?: GridRow[];
}

interface GridViewProps {
  columns: GridColumn[];
  rows: GridRow[];
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onRowAdd?: (parentId?: string) => void;
  onRowDelete?: (rowId: string) => void;
  onColumnAdd?: () => void;
  onColumnDelete?: (columnId: string) => void;
  showAddRow?: boolean;
  showAddColumn?: boolean;
  frozenColumns?: number; // Number of columns to freeze (like account name)
  defaultColumnWidth?: number;
  minColumnWidth?: number;
  defaultExpanded?: boolean; // Expand all rows by default
}

export default function GridView({
  columns,
  rows: initialRows,
  onCellChange,
  onRowAdd,
  onRowDelete,
  onColumnAdd,
  onColumnDelete,
  showAddRow = true,
  showAddColumn = true,
  frozenColumns = 1,
  defaultColumnWidth = 150,
  minColumnWidth = 100,
  defaultExpanded = false,
}: GridViewProps) {
  const [rows, setRows] = useState<GridRow[]>(initialRows);
  
  // Initialize expanded rows - expand all if defaultExpanded is true
  const getInitialExpandedRows = useCallback(() => {
    if (!defaultExpanded) return new Set<string>();
    const expanded = new Set<string>();
    const findGroups = (rows: GridRow[]) => {
      rows.forEach(row => {
        if (row.isGroup) {
          expanded.add(row.id);
          if (row.children) {
            findGroups(row.children);
          }
        }
      });
    };
    findGroups(initialRows);
    return expanded;
  }, [initialRows, defaultExpanded]);
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(getInitialExpandedRows);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [cellValue, setCellValue] = useState<any>("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    columns.forEach(col => {
      widths[col.id] = col.width || defaultColumnWidth;
    });
    return widths;
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update rows when initialRows changes
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // Flatten rows with hierarchy
  const flattenedRows = useMemo(() => {
    const flatten = (rows: GridRow[], level = 0, parentId?: string): GridRow[] => {
      const result: GridRow[] = [];
      rows.forEach(row => {
        const flattened = { ...row, level, parentId };
        result.push(flattened);
        if (row.children && row.children.length > 0 && expandedRows.has(row.id)) {
          result.push(...flatten(row.children, level + 1, row.id));
        }
      });
      return result;
    };
    return flatten(rows);
  }, [rows, expandedRows]);

  // Calculate totals for group rows
  const calculateRowValue = useCallback((row: GridRow, column: GridColumn): any => {
    if (column.formula) {
      return column.formula(row, rows);
    }
    return row.data[column.id] ?? "";
  }, [rows]);

  // Helper to get all child rows recursively
  const getAllChildRows = useCallback((parentId: string, allRows: GridRow[]): GridRow[] => {
    const children: GridRow[] = [];
    const findChildren = (parentId: string, rows: GridRow[]) => {
      rows.forEach(row => {
        if (row.parentId === parentId) {
          children.push(row);
          if (row.children) {
            findChildren(row.id, row.children);
          }
        }
        if (row.children) {
          findChildren(parentId, row.children);
        }
      });
    };
    findChildren(parentId, allRows);
    return children;
  }, []);

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const startEditing = (rowId: string, columnId: string, currentValue: any) => {
    const column = columns.find(c => c.id === columnId);
    if (column && column.editable !== false) {
      setEditingCell({ rowId, columnId });
      setCellValue(currentValue ?? "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const saveCell = () => {
    if (!editingCell) return;
    
    const { rowId, columnId } = editingCell;
    const column = columns.find(c => c.id === columnId);
    
    let value: any = cellValue;
    if (column?.type === 'number' || column?.type === 'currency') {
      value = parseFloat(cellValue) || 0;
    }

    if (onCellChange) {
      onCellChange(rowId, columnId, value);
    } else {
      setRows(prevRows => {
        const updateRow = (rows: GridRow[]): GridRow[] => {
          return rows.map(row => {
            if (row.id === rowId) {
              return { ...row, data: { ...row.data, [columnId]: value } };
            }
            if (row.children) {
              return { ...row, children: updateRow(row.children) };
            }
            return row;
          });
        };
        return updateRow(prevRows);
      });
    }

    setEditingCell(null);
    setCellValue("");
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setCellValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCell();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!editingCell) return;
      
      const currentRowIndex = flattenedRows.findIndex(r => r.id === editingCell.rowId);
      const currentColIndex = columns.findIndex(c => c.id === editingCell.columnId);
      
      let nextRowIndex = currentRowIndex;
      let nextColIndex = currentColIndex;
      
      if (e.shiftKey) {
        // Shift+Tab: move to previous cell
        if (currentColIndex > 0) {
          nextColIndex = currentColIndex - 1;
        } else if (currentRowIndex > 0) {
          nextRowIndex = currentRowIndex - 1;
          nextColIndex = columns.length - 1;
        }
      } else {
        // Tab: move to next cell
        if (currentColIndex < columns.length - 1) {
          nextColIndex = currentColIndex + 1;
        } else if (currentRowIndex < flattenedRows.length - 1) {
          nextRowIndex = currentRowIndex + 1;
          nextColIndex = 0;
        }
      }
      
      const nextRow = flattenedRows[nextRowIndex];
      const nextCol = columns[nextColIndex];
      if (nextRow && nextCol) {
        const currentValue = calculateRowValue(nextRow, nextCol);
        startEditing(nextRow.id, nextCol.id, currentValue);
      }
    }
  };

  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(columnId);
    const startX = e.clientX;
    const startWidth = columnWidths[columnId];

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(minColumnWidth, startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const visibleColumns = columns.filter(col => col.id !== 'hidden');

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {showAddRow && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRowAdd?.()}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Row
            </Button>
          )}
          {showAddColumn && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onColumnAdd?.()}
              className="h-8"
            >
              <Columns className="w-4 h-4 mr-1" />
              Add Column
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div 
        ref={gridRef}
        className="flex-1 overflow-auto"
        onKeyDown={handleKeyDown}
      >
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-muted/50 border-b border-border">
            <div className="flex">
              {/* Frozen columns */}
              {visibleColumns.slice(0, frozenColumns).map(column => (
                <div
                  key={column.id}
                  className="flex-shrink-0 border-r border-border bg-muted/70 px-3 py-2 font-semibold text-sm"
                  style={{ width: columnWidths[column.id] }}
                >
                  <div className="flex items-center justify-between relative">
                    <span>{column.label}</span>
                    {column.id !== visibleColumns[0]?.id && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                        onMouseDown={(e) => handleResizeStart(column.id, e)}
                      />
                    )}
                  </div>
                </div>
              ))}
              
              {/* Scrollable columns */}
              {visibleColumns.slice(frozenColumns).map(column => (
                <div
                  key={column.id}
                  className="flex-shrink-0 border-r border-border px-3 py-2 font-semibold text-sm relative"
                  style={{ width: columnWidths[column.id] }}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                      onMouseDown={(e) => handleResizeStart(column.id, e)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div>
            {flattenedRows.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">No data available</p>
                  {onRowAdd && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRowAdd?.()}
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add First Row
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              flattenedRows.map((row) => {
              const isEditing = editingCell?.rowId === row.id;
              const indent = (row.level || 0) * 24;

              return (
                <div
                  key={row.id}
                  className="flex border-b border-border hover:bg-muted/30 transition-colors"
                >
                  {/* Frozen columns */}
                  {visibleColumns.slice(0, frozenColumns).map(column => {
                    const isEditingThisCell = isEditing && editingCell?.columnId === column.id;
                    const value = calculateRowValue(row, column);
                    const displayValue = column.type === 'currency' 
                      ? (typeof value === 'number' ? formatCurrency(value) : value)
                      : value;

                    return (
                      <div
                        key={column.id}
                        className="flex-shrink-0 border-r border-border px-3 py-2 text-sm relative group"
                        style={{ width: columnWidths[column.id] }}
                      >
                        <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
                          {row.isGroup && (
                            <button
                              onClick={() => toggleRowExpansion(row.id)}
                              className="p-0.5 hover:bg-muted rounded"
                            >
                              {expandedRows.has(row.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {isEditingThisCell ? (
                            <Input
                              ref={inputRef}
                              value={cellValue}
                              onChange={(e) => setCellValue(e.target.value)}
                              onBlur={saveCell}
                              className="h-7 text-sm"
                              type="text"
                            />
                          ) : (
                            <div
                              className={`flex-1 ${column.editable !== false ? 'cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5' : ''} ${row.isGroup ? 'font-semibold' : ''}`}
                              onClick={() => column.editable !== false && startEditing(row.id, column.id, value)}
                            >
                              {displayValue || <span className="text-muted-foreground">—</span>}
                            </div>
                          )}
                        </div>
                        {onRowDelete && !row.isGroup && (
                          <button
                            onClick={() => onRowDelete(row.id)}
                            className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded"
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Scrollable columns */}
                  {visibleColumns.slice(frozenColumns).map(column => {
                    const isEditingThisCell = isEditing && editingCell?.columnId === column.id;
                    const value = calculateRowValue(row, column);
                    const displayValue = column.type === 'currency' 
                      ? (typeof value === 'number' ? formatCurrency(value) : value)
                      : value;

                    return (
                      <div
                        key={column.id}
                        className="flex-shrink-0 border-r border-border px-3 py-2 text-sm relative group"
                        style={{ width: columnWidths[column.id] }}
                      >
                        {isEditingThisCell ? (
                          <Input
                            ref={inputRef}
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={saveCell}
                            className="h-7 text-sm"
                            type="text"
                          />
                        ) : (
                          <div
                            className={`${column.editable !== false ? 'cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5' : ''} ${row.isGroup ? 'font-semibold' : ''}`}
                            onClick={() => column.editable !== false && startEditing(row.id, column.id, value)}
                          >
                            {displayValue || <span className="text-muted-foreground">—</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }))}
          </div>
        </div>
      </div>
    </div>
  );
}

