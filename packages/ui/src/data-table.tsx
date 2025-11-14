"use client";

import { useState, useMemo, useEffect, useRef, ReactNode, Fragment } from "react";
import { Button } from "@smartlogbook/ui/button";
import { Input } from "@smartlogbook/ui/input";
import { Checkbox } from "@smartlogbook/ui/checkbox";
import { Badge } from "@smartlogbook/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  Search, 
  Download, 
  RefreshCw,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Columns
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@smartlogbook/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@smartlogbook/ui/select";

interface DataTableProps {
  data: any[];
  columns: ColumnDef<any>[];
  loading?: boolean;
  searchable?: boolean;
  selectable?: boolean;
  sortable?: boolean;
  title?: string;
  description?: string;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: any) => void;
  onRowSelect?: (rowId: number, selected: boolean) => void;
  onBulkAction?: (action: string, selectedIds: number[]) => void;
  onExport?: (data: any[]) => void;
  onRefresh?: () => void;
  createButton?: {
    href: string;
    label: string;
  };
  exportButton?: {
    onClick: () => void;
    label?: string;
  };
  refreshButton?: {
    onClick: () => void;
  };
  searchKey?: string;
  searchPlaceholder?: string;
  selectedRows?: Set<number>;
  onSelectedRowsChange?: (selectedRows: Set<number>) => void;
  expandedRows?: Set<number>;
  onExpandedRowsChange?: (expandedRows: Set<number>) => void;
  renderExpandedRow?: (row: any) => ReactNode;
  isRowExpandable?: (row: any) => boolean;
}

export default function DataTable({
  data,
  columns,
  loading = false,
  searchable = true,
  selectable = false,
  sortable = true,
  title = "Data Table",
  description = "Manage your data",
  pagination = true,
  pageSize = 10,
  onRowClick,
  onRowSelect,
  onBulkAction,
  onExport,
  onRefresh,
  createButton,
  exportButton,
  refreshButton,
  searchKey = "name",
  searchPlaceholder = "Search...",
  selectedRows: externalSelectedRows,
  onSelectedRowsChange,
  expandedRows: externalExpandedRows,
  onExpandedRowsChange,
  renderExpandedRow,
  isRowExpandable
}: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [internalSelectedRows, setInternalSelectedRows] = useState<Set<number>>(new Set());
  const [internalExpandedRows, setInternalExpandedRows] = useState<Set<number>>(new Set());
  
  // Use external expandedRows if provided, otherwise use internal state
  const expandedRows = externalExpandedRows ?? internalExpandedRows;
  const setExpandedRows = onExpandedRowsChange ?? setInternalExpandedRows;
  // Initialize page size from localStorage if available
  const [currentPageSize, setCurrentPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPageSize = localStorage.getItem(`datatable-page-size-${title}`);
      if (savedPageSize) {
        const parsed = parseInt(savedPageSize, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    return pageSize;
  });
  const isInitialMount = useRef(true);
  
  // Use external selectedRows if provided, otherwise use internal state
  const selectedRows = externalSelectedRows ?? internalSelectedRows;
  const setSelectedRows = onSelectedRowsChange ?? setInternalSelectedRows;
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((col, index) => col.id || (col as any).accessorKey || `col-${index}`))
  );

  // Load column visibility from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedColumns = localStorage.getItem(`datatable-columns-${title}`);
      if (savedColumns) {
        try {
          const parsedColumns = JSON.parse(savedColumns);
          setVisibleColumns(new Set(parsedColumns));
        } catch (error) {
          console.error('Error parsing saved column visibility:', error);
        }
      }
    }
  }, [title]);

  // Save column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const allColumns = new Set(columns.map((col, index) => col.id || (col as any).accessorKey || `col-${index}`));
      const hasHiddenColumns = visibleColumns.size < allColumns.size;
      
      if (hasHiddenColumns) {
        localStorage.setItem(`datatable-columns-${title}`, JSON.stringify(Array.from(visibleColumns)));
      } else {
        localStorage.removeItem(`datatable-columns-${title}`);
      }
    }
  }, [visibleColumns, title, columns]);

  // Persist page size (only on user changes, not initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`datatable-page-size-${title}`, String(currentPageSize));
    }
  }, [currentPageSize, title]);

  // Helper function to get nested values
  const getNestedValue = (obj: any, path: string) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Sort data
  const sortedData = useMemo(() => {
    // Ensure data is always an array
    const dataArray = Array.isArray(data) ? data : [];
    
    if (!sortColumn) return dataArray;
    
    return [...dataArray].sort((a, b) => {
      const aValue = getNestedValue(a, sortColumn);
      const bValue = getNestedValue(b, sortColumn);
      
      // Handle undefined/null values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortDirection === "asc" ? 1 : -1;
      if (bValue === undefined) return sortDirection === "asc" ? -1 : 1;
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * currentPageSize;
    const endIndex = startIndex + currentPageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, currentPageSize, pagination]);

  const totalPages = Math.ceil((Array.isArray(sortedData) ? sortedData : []).length / currentPageSize);

  const handleSort = (columnKey: string) => {
    if (!columnKey) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const handleRowClick = (row: any) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedData.map((_, index) => index));
      setSelectedRows(allIds);
      
      // Call external handler for each row
      if (onRowSelect) {
        paginatedData.forEach(row => onRowSelect(row.id, true));
      }
    } else {
      setSelectedRows(new Set());
      
      // Call external handler for each row
      if (onRowSelect) {
        paginatedData.forEach(row => onRowSelect(row.id, false));
      }
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
    
    // Call external handler if provided
    if (onRowSelect) {
      const rowData = paginatedData[index];
      onRowSelect(rowData.id, checked);
    }
  };

  const toggleRowExpansion = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };
  
  // Expose function to programmatically expand/collapse rows
  const expandRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    newExpanded.add(index);
    setExpandedRows(newExpanded);
  };
  
  const collapseRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    newExpanded.delete(index);
    setExpandedRows(newExpanded);
  };

  const isAllSelected = selectedRows.size === paginatedData.length && paginatedData.length > 0;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < paginatedData.length;

  // Handle column visibility toggle
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnKey)) {
      newVisibleColumns.delete(columnKey);
    } else {
      newVisibleColumns.add(columnKey);
    }
    setVisibleColumns(newVisibleColumns);
  };

  // Get visible columns
  const getVisibleColumns = () => {
    return columns.filter((col, index) => {
      const columnKey = col.id || (col as any).accessorKey || `col-${index}`;
      // Always show columns with enableHiding: false
      if ((col as any).enableHiding === false) {
        return true;
      }
      // Skip the select column as it's handled separately
      if (columnKey === 'select') {
        return false;
      }
      return visibleColumns.has(columnKey);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {renderExpandedRow && (
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">
                  <span className="sr-only">Expand</span>
                </th>
              )}
              {selectable && (
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-border"
                    aria-label="Select all"
                  />
                </th>
              )}
              {getVisibleColumns().map((column, index) => {
                const columnKey = column.id || (column as any).accessorKey || `col-${index}`;
                return (
                  <th 
                    key={columnKey} 
                    className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">
                        {column.header && typeof column.header === 'function' 
                          ? column.header({ column: { toggleSorting: () => handleSort((column as any).accessorKey || column.id as string) } } as any)
                          : column.header
                        }
                      </span>
                      {sortable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleSort((column as any).accessorKey || column.id as string)}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={getVisibleColumns().length + (selectable ? 1 : 0) + (renderExpandedRow !== undefined ? 1 : 0)} 
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const isExpanded = expandedRows.has(rowIndex);
                const canExpand = renderExpandedRow && (isRowExpandable !== undefined ? isRowExpandable(row) : true);
                return (
                  <Fragment key={rowIndex}>
                    <tr 
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(row)}
                    >
                      {renderExpandedRow && (
                        <td className="px-3 py-4">
                          {canExpand ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => toggleRowExpansion(rowIndex, e)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <div className="w-6 h-6" />
                          )}
                        </td>
                      )}
                      {selectable && (
                        <td className="px-3 py-4">
                          <Checkbox
                            checked={selectedRows.has(rowIndex)}
                            onCheckedChange={(checked) => handleSelectRow(rowIndex, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                            className="border-border"
                          />
                        </td>
                      )}
                      {getVisibleColumns().map((column, colIndex) => {
                    const columnKey = column.id || (column as any).accessorKey || `col-${colIndex}`;
                    const accessorKey = (column as any).accessorKey || column.id;
                    return (
                      <td 
                        key={columnKey} 
                        className="px-3 py-4 text-sm text-foreground"
                      >
                        {column.cell && typeof column.cell === 'function' ? (
                          column.cell({ 
                            row: { 
                              original: row, 
                              getValue: (key: string) => getNestedValue(row, key),
                              getIsSelected: () => selectedRows.has(row.id),
                              toggleSelected: (value: boolean) => handleSelectRow(rowIndex, value)
                            } 
                          } as any)
                        ) : (
                          <span>
                            {accessorKey ? getNestedValue(row, accessorKey) : 'N/A'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                    </tr>
                    {isExpanded && renderExpandedRow && (
                      <tr key={`${rowIndex}-expanded`}>
                        <td 
                          colSpan={getVisibleColumns().length + (selectable ? 1 : 0) + (renderExpandedRow !== undefined ? 1 : 0)}
                          className="px-3 py-4 bg-muted/30 border-b border-border"
                        >
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {sortedData.length === 0 ? 0 : ((currentPage - 1) * currentPageSize) + 1} to {Math.min(currentPage * currentPageSize, sortedData.length)} of {sortedData.length} entries
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={String(currentPageSize)} onValueChange={(value) => { setCurrentPageSize(parseInt(value, 10)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {(() => {
                const pages: (number | string)[] = [];
                
                if (totalPages <= 7) {
                  // Show all pages if 7 or fewer
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // Always show first page
                  pages.push(1);
                  
                  if (currentPage <= 3) {
                    // Near the start
                    pages.push(2, 3, 4, '...', totalPages);
                  } else if (currentPage >= totalPages - 2) {
                    // Near the end
                    pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    // In the middle
                    pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                  }
                }
                
                return pages.map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  const pageNum = page as number;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                });
              })()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}