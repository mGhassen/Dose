"use client";

import { useState, useEffect, useMemo, ReactNode } from "react";
import { Button } from "@kit/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@kit/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@kit/ui/popover";
import { Checkbox } from "@kit/ui/checkbox";
import { 
  Plus, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  Search,
  ArrowDownUp,
  ChevronDown,
  GripVertical,
  X,
  Columns,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import DataTable from "@kit/ui/data-table";
import { UnifiedFilter, FilterOption, FilterState } from "@/components/unified-filter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import GridView, { GridColumn, GridRow } from "@/components/grid-view";
import ViewToggle from "@/components/view-toggle";

interface DataTablePageProps<T> {
  title: string;
  description: string;
  createHref?: string;
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  onDelete?: (id: number) => Promise<void>;
  onBulkDelete?: (ids: number[]) => Promise<void>;
  onBulkCopy?: (data: T[], type: 'selected' | 'all') => void;
  onBulkExport?: (data: T[], type: 'selected' | 'all') => void;
  filterColumns?: Array<{ value: string; label: string }>;
  sortColumns?: Array<{ value: string; label: string; type: string }>;
  localStoragePrefix: string;
  searchFields?: string[];
  filterOptions?: FilterOption[];
  defaultHiddenColumns?: string[];
  headerActions?: ReactNode;
  renderExpandedRow?: (row: T) => ReactNode;
  isRowExpandable?: (row: T) => boolean;
  expandedRows?: Set<number>;
  onExpandedRowsChange?: (expandedRows: Set<number>) => void;
  // Server-side pagination props
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  // Grid view props
  enableGridView?: boolean;
  defaultView?: 'table' | 'grid';
}

export default function DataTablePage<T>({
  title,
  description,
  createHref,
  data,
  columns,
  loading = false,
  onRowClick,
  onDelete,
  onBulkDelete,
  onBulkCopy,
  onBulkExport,
  filterColumns = [],
  sortColumns = [],
  localStoragePrefix,
  searchFields = [],
  filterOptions = [],
  defaultHiddenColumns = [],
  headerActions,
  renderExpandedRow,
  isRowExpandable,
  expandedRows,
  onExpandedRowsChange,
  pagination,
  enableGridView = true,
  defaultView = 'grid'
}: DataTablePageProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('common');
  const tDataTable = useTranslations('dataTable');
  const tMessages = useTranslations('messages');
  const tForms = useTranslations('forms');
  const [filteredData, setFilteredData] = useState<T[]>([]);
  
  // View state - load from localStorage or use default
  const [view, setView] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined' && enableGridView) {
      const savedView = localStorage.getItem(`${localStoragePrefix}-view`);
      if (savedView === 'table' || savedView === 'grid') {
        return savedView;
      }
    }
    return defaultView;
  });

  // Save view preference
  useEffect(() => {
    if (typeof window !== 'undefined' && enableGridView) {
      localStorage.setItem(`${localStoragePrefix}-view`, view);
    }
  }, [view, localStoragePrefix, enableGridView]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortRules, setSortRules] = useState<Array<{id: string, column: string, direction: "asc" | "desc"}>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`${localStoragePrefix}-sort-rules`);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed.filter(rule => rule && rule.column && rule.direction) : [];
      } catch (error) {
        console.error('Error parsing sort rules from localStorage:', error);
        localStorage.removeItem(`${localStoragePrefix}-sort-rules`);
        return [];
      }
    }
    return [];
  });
  const [appliedFilters, setAppliedFilters] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`${localStoragePrefix}-applied-filters`);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed.filter(filter => filter && filter.column && filter.operator) : [];
      } catch (error) {
        console.error('Error parsing applied filters from localStorage:', error);
        localStorage.removeItem(`${localStoragePrefix}-applied-filters`);
        return [];
      }
    }
    return [];
  });
  const [pendingFilters, setPendingFilters] = useState<any[]>([]);
  const [unifiedFilters, setUnifiedFilters] = useState<FilterState>({});

  useEffect(() => {
    setPendingFilters([...appliedFilters]);
  }, []);

  // Handle unified filter changes
  const handleUnifiedFilterChange = (filters: FilterState, search: string) => {
    setUnifiedFilters(filters);
    setSearchTerm(search);
  };

  const handleRowClick = (item: T) => {
    if (onRowClick) {
      onRowClick(item);
    }
  };

  const handleDelete = async (id: number) => {
    if (onDelete && confirm(tMessages('confirm.delete', { item: 'item' }))) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error(tMessages('error.deleteItem'), error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0 || !onBulkDelete) return;
    
    if (confirm(tMessages('confirm.deleteItems', { count: selectedRows.size }))) {
      try {
        const ids = Array.from(selectedRows);
        await onBulkDelete(ids);
        setSelectedRows(new Set());
      } catch (error) {
        console.error(tMessages('error.deleteItems'), error);
      }
    }
  };

  const handleBulkCopy = (type: 'selected' | 'all') => {
    if (!onBulkCopy) return;
    
    const dataToCopy = type === 'selected' 
      ? filteredData.filter((item, index) => selectedRows.has(index))
      : filteredData;
    
    onBulkCopy(dataToCopy, type);
  };

  const handleBulkExport = (type: 'selected' | 'all') => {
    if (!onBulkExport) return;
    
    const dataToExport = type === 'selected' 
      ? filteredData.filter((item, index) => selectedRows.has(index))
      : filteredData;
    
    onBulkExport(dataToExport, type);
  };

  useEffect(() => {
    // For server-side pagination, apply client-side filtering on the server-paginated data
    // (Backend doesn't support filtering yet, so we filter the already-paginated results)
    if (pagination) {
      let filtered: T[] = Array.isArray(data) ? data : [];
      const hasFilters = searchTerm || Object.keys(unifiedFilters).length > 0 || appliedFilters.length > 0;
      
      if (hasFilters) {
        // Apply unified filters
        Object.entries(unifiedFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== "" && value !== null) {
            filtered = filtered.filter((item: any) => {
              const itemValue = item[key];
              
              if (Array.isArray(value)) {
                return value.some(v => String(itemValue).toLowerCase().includes(String(v).toLowerCase()));
              } else if (value instanceof Date) {
                const itemDate = new Date(itemValue);
                return itemDate.toDateString() === value.toDateString();
              } else {
                return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
              }
            });
          }
        });

        // Apply search term
        if (searchTerm && searchFields.length > 0) {
          const q = searchTerm.toLowerCase();
          filtered = filtered.filter((item: any) =>
            searchFields.some(field => {
              const value = item[field];
              return value && typeof value === 'string' && value.toLowerCase().includes(q);
            })
          );
        }

        // Apply applied filters
        appliedFilters.forEach(filter => {
          if (!filter.column) return;
          
          filtered = filtered.filter((item: any) => {
            const value = item[filter.column];
            const filterValue = filter.value;
            
            if (!filterValue || (typeof filterValue === 'string' && filterValue.trim() === '')) {
              return true;
            }
            
            switch (filter.operator) {
              case 'equals':
                if (typeof value === 'number' && !isNaN(Number(filterValue))) {
                  return value === Number(filterValue);
                }
                return String(value) === String(filterValue);
              case 'not_equals':
                if (typeof value === 'number' && !isNaN(Number(filterValue))) {
                  return value !== Number(filterValue);
                }
                return String(value) !== String(filterValue);
              case 'contains':
                return value != null && String(value).toLowerCase().includes(String(filterValue).toLowerCase());
              case 'starts_with':
                return value != null && String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
              case 'ends_with':
                return value != null && String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
              case 'greater_than':
                if (typeof value === 'number' && !isNaN(Number(filterValue))) {
                  return value > Number(filterValue);
                }
                return String(value) > String(filterValue);
              case 'less_than':
                if (typeof value === 'number' && !isNaN(Number(filterValue))) {
                  return value < Number(filterValue);
                }
                return String(value) < String(filterValue);
              default:
                return true;
            }
          });
        });
      }
      
      setFilteredData(filtered);
      return;
    }

    // Client-side pagination: apply filters and search
    let filtered: T[] = Array.isArray(data) ? data : [];

    // Apply unified filters first
    Object.entries(unifiedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        filtered = filtered.filter((item: any) => {
          // Handle nested field access (e.g., 'event.id', 'assetModel.id')
          let itemValue: any;
          if (key.includes('.')) {
            const keys = key.split('.');
            itemValue = keys.reduce((obj, k) => obj?.[k], item);
          } else {
            itemValue = item[key];
          }
          
          if (Array.isArray(value)) {
            return value.some(v => String(itemValue).toLowerCase().includes(String(v).toLowerCase()));
          } else if (value instanceof Date) {
            const itemDate = new Date(itemValue);
            return itemDate.toDateString() === value.toDateString();
          } else {
            // For ID fields, do exact match
            if (key.includes('Id') || key.includes('_id')) {
              return String(itemValue) === String(value);
            }
            return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
          }
        });
      }
    });

    // Apply search term
    if (searchTerm && searchFields.length > 0) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((item: any) =>
        searchFields.some(field => {
          const value = item[field];
          return value && typeof value === 'string' && value.toLowerCase().includes(q);
        })
      );
    }

    appliedFilters.forEach(filter => {
      if (!filter.column) return;
      
      filtered = filtered.filter((item: any) => {
        const value = item[filter.column];
        const filterValue = filter.value;
        
        if (!filterValue || (typeof filterValue === 'string' && filterValue.trim() === '')) {
          return true;
        }
        
        switch (filter.operator) {
          case 'equals':
            if (typeof value === 'number' && !isNaN(Number(filterValue))) {
              return value === Number(filterValue);
            }
            return String(value) === String(filterValue);
          case 'not_equals':
            if (typeof value === 'number' && !isNaN(Number(filterValue))) {
              return value !== Number(filterValue);
            }
            return String(value) !== String(filterValue);
          case 'contains':
            return value != null && String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'starts_with':
            return value != null && String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'ends_with':
            return value != null && String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'greater_than':
            if (typeof value === 'number' && !isNaN(Number(filterValue))) {
              return value > Number(filterValue);
            }
            return String(value) > String(filterValue);
          case 'less_than':
            if (typeof value === 'number' && !isNaN(Number(filterValue))) {
              return value < Number(filterValue);
            }
            return String(value) < String(filterValue);
          default:
            return true;
        }
      });
    });

    if (sortRules.length > 0) {
      filtered = [...filtered].sort((a: any, b: any) => {
        for (const rule of sortRules) {
          if (!rule.column) continue;
          
          let aValue = a[rule.column];
          let bValue = b[rule.column];
          
          if (rule.column.includes('.')) {
            const keys = rule.column.split('.');
            aValue = keys.reduce((obj, key) => obj?.[key], a);
            bValue = keys.reduce((obj, key) => obj?.[key], b);
          }
          
          if (rule.column === 'created_at' || rule.column === 'updated_at' || rule.column === 'reported_at') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }
          
          if (aValue == null && bValue == null) continue;
          if (aValue == null) return rule.direction === "asc" ? 1 : -1;
          if (bValue == null) return rule.direction === "asc" ? -1 : 1;
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }
          
          if (aValue < bValue) return rule.direction === "asc" ? -1 : 1;
          if (aValue > bValue) return rule.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredData(filtered);
  }, [data, searchTerm, sortRules, appliedFilters, searchFields, unifiedFilters, pagination]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sortRules.length > 0) {
        localStorage.setItem(`${localStoragePrefix}-sort-rules`, JSON.stringify(sortRules));
      } else {
        localStorage.removeItem(`${localStoragePrefix}-sort-rules`);
      }
    }
  }, [sortRules, localStoragePrefix]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (appliedFilters.length > 0) {
        localStorage.setItem(`${localStoragePrefix}-applied-filters`, JSON.stringify(appliedFilters));
      } else {
        localStorage.removeItem(`${localStoragePrefix}-applied-filters`);
      }
    }
  }, [appliedFilters, localStoragePrefix]);

  // Get all column keys
  const getAllColumnKeys = () => columns.map((col, index) => col.id || (col as any).accessorKey || `col-${index}`);

  // Column order state - load from localStorage or use default order
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const allColumns = columns.map((col, index) => col.id || (col as any).accessorKey || `col-${index}`);
    
    if (typeof window !== 'undefined') {
      try {
        const savedOrder = localStorage.getItem(`${localStoragePrefix}-column-order`);
        if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder);
          // Validate saved order - only include columns that still exist
          const validOrder = parsedOrder.filter((key: string) => allColumns.includes(key));
          // Add any new columns that weren't in saved order
          const newColumns = allColumns.filter(key => !validOrder.includes(key));
          return [...validOrder, ...newColumns];
        }
      } catch (error) {
        console.error('Error parsing saved column order:', error);
      }
    }
    
    return allColumns;
  });

  // Update column order when columns change (e.g., new columns added)
  useEffect(() => {
    const allColumns = getAllColumnKeys();
    setColumnOrder(prevOrder => {
      const currentOrderSet = new Set(prevOrder);
      const allColumnsSet = new Set(allColumns);
      
      // Check if there are new columns not in current order
      const newColumns = allColumns.filter(key => !currentOrderSet.has(key));
      // Check if there are removed columns (no longer in allColumns)
      const validOrder = prevOrder.filter(key => allColumnsSet.has(key));
      
      if (newColumns.length > 0 || validOrder.length !== prevOrder.length) {
        return [...validOrder, ...newColumns];
      }
      return prevOrder;
    });
  }, [columns]);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const allColumns = getAllColumnKeys();
    const hiddenColumns = new Set(defaultHiddenColumns);
    
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const savedColumns = localStorage.getItem(`${localStoragePrefix}-visible-columns`);
        if (savedColumns) {
          const parsedColumns = JSON.parse(savedColumns);
          const savedSet = new Set(parsedColumns);
          // Only use saved columns if they're still valid (exist in current columns)
          const validSavedColumns = Array.from(savedSet).filter(colKey => allColumns.includes(colKey));
          if (validSavedColumns.length > 0) {
            // Merge saved columns with any new columns that weren't in the saved set
            // This ensures new columns are visible by default
            const newColumns = allColumns.filter(colKey => !savedSet.has(colKey) && !hiddenColumns.has(colKey));
            return new Set([...validSavedColumns, ...newColumns]);
          }
        }
      } catch (error) {
        console.error('Error parsing saved column visibility:', error);
      }
    }
    
    // Default: show all columns except those in defaultHiddenColumns
    return new Set(allColumns.filter(colKey => !hiddenColumns.has(colKey)));
  });

  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnKey)) {
      newVisibleColumns.delete(columnKey);
    } else {
      newVisibleColumns.add(columnKey);
    }
    setVisibleColumns(newVisibleColumns);
  };

  // Save column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const allColumns = getAllColumnKeys();
      const allColumnsSet = new Set(allColumns);
      const hasHiddenColumns = visibleColumns.size < allColumnsSet.size;
      
      // Only save if there are hidden columns (user preference)
      if (hasHiddenColumns) {
        localStorage.setItem(`${localStoragePrefix}-visible-columns`, JSON.stringify(Array.from(visibleColumns)));
      } else {
        localStorage.removeItem(`${localStoragePrefix}-visible-columns`);
      }
    }
  }, [visibleColumns, localStoragePrefix, columns]);

  // Save column order to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${localStoragePrefix}-column-order`, JSON.stringify(columnOrder));
    }
  }, [columnOrder, localStoragePrefix]);

  // Handle drag and drop for column reordering
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const handleDragStart = (columnKey: string) => {
    setDraggedColumn(columnKey);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnKey) {
      setDraggedOverColumn(columnKey);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== targetColumnKey) {
      const newOrder = [...columnOrder];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumnKey);
      
      // Remove dragged column from its position
      newOrder.splice(draggedIndex, 1);
      // Insert at target position
      newOrder.splice(targetIndex, 0, draggedColumn);
      
      setColumnOrder(newOrder);
    }
    setDraggedColumn(null);
    setDraggedOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDraggedOverColumn(null);
  };

  const hasHiddenColumns = visibleColumns.size < columns.length;

  return (
    <div className="space-y-0 flex flex-col h-full">
        <div className="px-4 py-3">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden flex-1 flex flex-col">
          <div className="bg-muted/50 border-b border-border px-4 py-2">
            <div className="flex items-center justify-between">
              {selectedRows.size > 0 ? (
                <div className="flex items-center gap-2">
                  {onBulkDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {tDataTable('bulkActions.deleteRows', { count: selectedRows.size })}
                    </Button>
                  )}
                  {onBulkCopy && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border hover:bg-muted/50"
                        >
                          {tDataTable('bulkActions.copy')}
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleBulkCopy('selected')}>
                          {tDataTable('bulkActions.copySelectedRows')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkCopy('all')}>
                          {tDataTable('bulkActions.copyAllRows')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {onBulkExport && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border hover:bg-muted/50"
                        >
                          {tDataTable('bulkActions.export')}
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleBulkExport('selected')}>
                          {tDataTable('bulkActions.exportSelectedRows')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkExport('all')}>
                          {tDataTable('bulkActions.exportAllRows')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`border-border hover:bg-muted/50 ${
                          appliedFilters.length > 0 
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700" 
                            : "bg-card text-foreground"
                        }`}
                      >
                        <Search className="w-4 h-4 mr-1" />
                        {appliedFilters.length > 0 ? tDataTable('filtering.filteredBy', { count: appliedFilters.length }) : tDataTable('filtering.filter')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-auto min-w-[400px] max-w-[90vw]">
                      <div className="p-4">
                        {pendingFilters.length === 0 && (
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold mb-1 text-foreground">
                              {tDataTable('filtering.noFiltersApplied')}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {tDataTable('filtering.addColumnToFilter')}
                            </p>
                          </div>
                        )}
                        
                        <div className="space-y-3 mb-4">
                          {pendingFilters.map((filter, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <select 
                                value={filter.column}
                                onChange={(e) => {
                                  const newFilters = [...pendingFilters];
                                  newFilters[index].column = e.target.value;
                                  setPendingFilters(newFilters);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                 className="flex-1 p-2 border border-border rounded-md bg-card text-foreground text-sm"
                              >
                                <option value="">{tForms('placeholders.selectColumn')}</option>
                                {filterColumns.map(col => (
                                  <option key={col.value} value={col.value}>{col.label}</option>
                                ))}
                              </select>
                              
                              <select 
                                value={filter.operator}
                                onChange={(e) => {
                                  const newFilters = [...pendingFilters];
                                  newFilters[index].operator = e.target.value;
                                  setPendingFilters(newFilters);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                 className="p-2 border border-border rounded-md bg-card text-foreground text-sm"
                              >
                                <option value="equals">{tDataTable('filtering.operators.equals')}</option>
                                <option value="not_equals">{tDataTable('filtering.operators.notEquals')}</option>
                                <option value="contains">{tDataTable('filtering.operators.contains')}</option>
                                <option value="starts_with">{tDataTable('filtering.operators.startsWith')}</option>
                                <option value="ends_with">{tDataTable('filtering.operators.endsWith')}</option>
                                <option value="greater_than">{tDataTable('filtering.operators.greaterThan')}</option>
                                <option value="less_than">{tDataTable('filtering.operators.lessThan')}</option>
                              </select>
                              
                              <input 
                                type="text"
                                placeholder={tForms('placeholders.enterValue')}
                                value={filter.value}
                                onChange={(e) => {
                                  const newFilters = [...pendingFilters];
                                  newFilters[index].value = e.target.value;
                                  setPendingFilters(newFilters);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    setAppliedFilters([...pendingFilters]);
                                  }
                                }}
                                 className="flex-1 p-2 border border-border rounded-md bg-card text-foreground text-sm"
                              />
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newFilters = pendingFilters.filter((_, i) => i !== index);
                                  setPendingFilters(newFilters);
                                  setAppliedFilters([...newFilters]);
                                }}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Button
                            variant="outline"
                            className="border-dashed border-2 border-border hover:border-muted-foreground text-muted-foreground text-sm"
                            onClick={() => {
                              const newFilter = {
                                column: "",
                                operator: "equals",
                                value: ""
                              };
                              setPendingFilters([...pendingFilters, newFilter]);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {tDataTable('filtering.addFilter')}
                          </Button>
                          
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4"
                            onClick={() => {
                              setAppliedFilters([...pendingFilters]);
                            }}
                          >
{tDataTable('filtering.applyFilter')}
                          </Button>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`border-border hover:bg-muted/50 ${
                          sortRules.length > 0 
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700" 
                            : "bg-card text-foreground"
                        }`}
                      >
                        <ArrowDownUp className="w-4 h-4 mr-1" />
                        {sortRules.length > 0 ? tDataTable('sorting.sortedBy', { count: sortRules.length }) : tDataTable('sorting.sort')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-auto min-w-[400px] max-w-[90vw]">
                      <div className="p-4">
                        {sortRules.length === 0 && (
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold mb-1 text-foreground">
                              {tDataTable('sorting.noSortsApplied')}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {tDataTable('sorting.addColumnToSort')}
                            </p>
                          </div>
                        )}
                        
                        <div className="space-y-2 mb-4">
                          {sortRules.map((rule, index) => (
                            <div key={rule.id} className="flex items-center gap-3">
                              <div className="cursor-move text-muted-foreground hover:text-foreground flex-shrink-0">
                                <GripVertical className="h-4 w-4" />
                              </div>
                              
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {index === 0 ? tDataTable('sorting.sortBy') : tDataTable('sorting.thenBy')}
                                </span>
                                <span className="font-semibold text-sm text-foreground">
                                  {rule.column}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-sm text-muted-foreground">
                                  {rule.direction === "asc" ? tDataTable('sorting.ascending') : tDataTable('sorting.descending')}
                                </span>
                                <button
                                  onClick={() => {
                                    const newRules = [...sortRules];
                                    newRules[index].direction = rule.direction === "asc" ? "desc" : "asc";
                                    setSortRules(newRules);
                                  }}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    rule.direction === "asc" ? "bg-primary" : "bg-muted"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                      rule.direction === "asc" ? "translate-x-5" : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newRules = sortRules.filter((_, i) => i !== index);
                                  setSortRules(newRules);
                                }}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="border-dashed border-2 border-border hover:border-muted-foreground text-muted-foreground text-sm"
                              >
                                <span>{tDataTable('sorting.pickColumnToSort')}</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-full">
                              {sortColumns.map(col => (
                                <DropdownMenuItem key={col.value} onClick={() => {
                                  const newRule = {
                                    id: Date.now().toString(),
                                    column: col.value,
                                    direction: "asc" as "asc" | "desc"
                                  };
                                  setSortRules([...sortRules, newRule]);
                                }}>
                                  {col.label} {col.type}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`border-border hover:bg-muted/50 ${
                          hasHiddenColumns 
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700" 
                            : "bg-card text-foreground"
                        }`}
                      >
                        <Columns className="w-4 h-4 mr-1" />
                        {hasHiddenColumns ? tDataTable('columns.hiddenColumns', { count: columns.length - visibleColumns.size }) : tDataTable('columns.columns')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 p-0">
                      <div className="p-3 border-b">
                        <div className="text-sm font-semibold">{tDataTable('columns.toggleColumns')}</div>
                        <div className="text-xs text-muted-foreground mt-1">Drag and drop to reorder columns</div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {columnOrder.map((columnKey) => {
                          const column = columns.find((col, idx) => {
                            const key = col.id || (col as any).accessorKey || `col-${idx}`;
                            return key === columnKey;
                          });
                          if (!column) return null;
                          
                          const columnLabel = typeof column.header === 'string' ? column.header : columnKey;
                          const isVisible = visibleColumns.has(columnKey);
                          const isDragging = draggedColumn === columnKey;
                          const isDraggedOver = draggedOverColumn === columnKey;
                          
                          return (
                            <div
                              key={columnKey}
                              draggable
                              onDragStart={() => handleDragStart(columnKey)}
                              onDragOver={(e) => handleDragOver(e, columnKey)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, columnKey)}
                              onDragEnd={handleDragEnd}
                              className={`
                                flex items-center gap-2 px-3 py-2 cursor-move
                                hover:bg-muted/50 transition-colors
                                ${isDragging ? 'opacity-50' : ''}
                                ${isDraggedOver ? 'border-t-2 border-primary' : ''}
                              `}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <Checkbox
                                checked={isVisible}
                                onCheckedChange={() => toggleColumnVisibility(columnKey)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-shrink-0"
                              />
                              <span className="flex-1 text-sm">{columnLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {headerActions}
              {enableGridView && (
                <ViewToggle view={view} onViewChange={setView} />
              )}
              {createHref && (
                <Button
                  className="bg-primary hover:bg-green-700 text-white"
                  asChild
                >
                  <Link href={createHref}>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('insert')}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Unified Filter */}
          {filterOptions.length > 0 && (
            <UnifiedFilter
              options={filterOptions}
              onFilterChange={handleUnifiedFilterChange}
              searchPlaceholder={`Search ${title.toLowerCase()}...`}
              searchKey="search"
            />
          )}

          {/* Grid View */}
          {view === 'grid' && enableGridView ? (
            <div className="flex-1 border-t border-border" style={{ minHeight: '600px' }}>
              {(() => {
                // Convert table columns to grid columns
                const gridColumns: GridColumn[] = columnOrder
                  .map(key => columns.find((col, idx) => {
                    const colKey = col.id || (col as any).accessorKey || `col-${idx}`;
                    return colKey === key;
                  }))
                  .filter((col): col is ColumnDef<T> => col !== undefined && visibleColumns.has(col.id || (col as any).accessorKey || ''))
                  .map((col, idx) => {
                    const colKey = col.id || (col as any).accessorKey || `col-${idx}`;
                    const header = typeof col.header === 'string' 
                      ? col.header 
                      : (col as any).header?.() || colKey;
                    
                    // Determine column type
                    let type: 'text' | 'number' | 'currency' | 'date' = 'text';
                    if (colKey.toLowerCase().includes('amount') || 
                        colKey.toLowerCase().includes('price') ||
                        colKey.toLowerCase().includes('cost') ||
                        colKey.toLowerCase().includes('balance') ||
                        colKey.toLowerCase().includes('total')) {
                      type = 'currency';
                    } else if (colKey.toLowerCase().includes('date')) {
                      type = 'date';
                    } else if (col.cell && typeof col.cell === 'function') {
                      const cellStr = col.cell.toString();
                      if (cellStr.includes('formatCurrency') || cellStr.includes('currency')) {
                        type = 'currency';
                      } else if (cellStr.includes('formatDate') || cellStr.includes('date')) {
                        type = 'date';
                      }
                    }

                    return {
                      id: colKey,
                      label: header,
                      type,
                      width: 150,
                      editable: type === 'text' || type === 'number' || type === 'currency',
                    };
                  });

                // Convert table rows to grid rows
                const gridRows: GridRow[] = filteredData.map((row: any, index: number) => {
                  const rowId = row.id?.toString() || `row-${index}`;
                  const rowData: Record<string, any> = {};
                  
                  gridColumns.forEach((gridCol) => {
                    const col = columns.find((c) => {
                      const colKey = c.id || (c as any).accessorKey;
                      return colKey === gridCol.id;
                    });
                    
                    if (col) {
                      const accessorKey = (col as any).accessorKey || col.id;
                      if (accessorKey) {
                        // Handle nested accessors
                        const keys = accessorKey.split('.');
                        let value: any = row;
                        for (const key of keys) {
                          value = value?.[key];
                        }
                        rowData[gridCol.id] = value ?? "";
                      }
                    }
                  });

                  // Get row label from first column or name/title field
                  const labelCol = gridColumns[0];
                  const label = rowData[labelCol?.id] || row.name || row.title || rowId;

                  return {
                    id: rowId,
                    label: String(label),
                    level: 0,
                    data: rowData,
                  };
                });

                return (
                  <GridView
                    columns={gridColumns}
                    rows={gridRows}
                    onCellChange={(rowId, columnId, value) => {
                      // Find the row and update it
                      const row = filteredData.find((r: any) => (r.id?.toString() || '') === rowId);
                      if (row && onRowClick) {
                        // Trigger row click to edit, or handle update directly
                        console.log('Cell changed:', { rowId, columnId, value });
                      }
                    }}
                    showAddRow={false}
                    showAddColumn={false}
                    frozenColumns={1}
                    defaultColumnWidth={150}
                  />
                );
              })()}
            </div>
          ) : (
            /* Table View */
            <DataTable 
            key={pagination ? `server-${pagination.page}-${pagination.pageSize}` : `client-${filteredData.length}`}
            columns={columnOrder
              .map(key => columns.find((col, idx) => {
                const colKey = col.id || (col as any).accessorKey || `col-${idx}`;
                return colKey === key;
              }))
              .filter((col): col is ColumnDef<T> => col !== undefined && visibleColumns.has(col.id || (col as any).accessorKey || ''))} 
            data={Array.isArray(filteredData) ? filteredData : []} 
            loading={loading}
            selectable={true}
            sortable={false}
            pagination={!pagination}
            pageSize={pagination ? pagination.pageSize : undefined}
            onRowClick={handleRowClick}
            onRowSelect={(rowId, selected) => {
              const newSelected = new Set(selectedRows);
              if (selected) {
                newSelected.add(rowId);
              } else {
                newSelected.delete(rowId);
              }
              setSelectedRows(newSelected);
            }}
            renderExpandedRow={renderExpandedRow}
            isRowExpandable={isRowExpandable}
            expandedRows={expandedRows}
            onExpandedRowsChange={onExpandedRowsChange}
          />
          )}

          {/* Server-side Pagination - only show when pagination prop is provided and in table view */}
          {pagination && view === 'table' && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {pagination.totalCount === 0 ? 0 : ((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} entries
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select 
                    value={String(pagination.pageSize)} 
                    onValueChange={(value) => {
                      const newPageSize = parseInt(value, 10);
                      pagination.onPageSizeChange(newPageSize);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages: (number | string)[] = [];
                      const totalPages = pagination.totalPages;
                      const currentPage = pagination.page;
                      
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
                            onClick={() => pagination.onPageChange(pageNum)}
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
                    onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );
}
