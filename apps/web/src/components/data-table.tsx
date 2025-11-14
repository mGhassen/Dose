"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@smartlogbook/ui/button";
import { Input } from "@smartlogbook/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@smartlogbook/ui/select";
import { Checkbox } from "@smartlogbook/ui/checkbox";
import { Badge } from "@smartlogbook/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@smartlogbook/ui/dropdown-menu";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  Trash2,
  Calendar,
  User,
  Clock,
  Users,
  Columns,
  Settings
} from "lucide-react";
import RelatedDataLink from "./related-data-link";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
  flex?: number;
  linkTo?: (value: any, row: any) => string | null; // Function to generate link href
}

interface GroupOption {
  key: string;
  label: string;
}

interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'date' | 'text';
  options?: { value: string; label: string }[];
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  groupOptions: GroupOption[];
  filterOptions?: FilterOption[];
  initialFilters?: Record<string, string>;
  onRowClick?: (row: any) => void;
  onRowSelect?: (rowId: number, selected: boolean) => void;
  onBulkAction?: (action: string, selectedIds: number[]) => void;
  onExport?: (data: any[]) => void;
  onRefresh?: () => void;
  loading?: boolean;
  searchable?: boolean;
  selectable?: boolean;
  title?: string;
  description?: string;
  pagination?: boolean;
  pageSize?: number;
}

export default function DataTable({
  data,
  columns,
  groupOptions,
  filterOptions = [],
  initialFilters = {},
  onRowClick,
  onRowSelect,
  onBulkAction,
  onExport,
  onRefresh,
  loading = false,
  searchable = true,
  selectable = true,
  title = "Data Table",
  description = "Manage your data",
  pagination = false,
  pageSize = 10
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map(col => col.key))
  );

  // Show filters if there are initial filters after hydration
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setShowFilters(true);
      
    }
  }, [initialFilters]);

  // Update filters when initialFilters prop changes
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
      
    }
  }, [initialFilters]);

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
      const allColumns = new Set(columns.map(col => col.key));
      const hasHiddenColumns = visibleColumns.size < allColumns.size;
      
      if (hasHiddenColumns) {
        localStorage.setItem(`datatable-columns-${title}`, JSON.stringify(Array.from(visibleColumns)));
      } else {
        localStorage.removeItem(`datatable-columns-${title}`);
      }
    }
  }, [visibleColumns, title, columns]);

  // Helper function to get nested values
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    let filtered = data;
    
    
    
    // Debug: Log first registration to see data structure
    if (data.length > 0) {
      
    }
    
    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply advanced filters
    Object.entries(filters).forEach(([filterKey, filterValue]) => {
      if (filterValue && filterValue !== 'all') {
        
        const beforeCount = filtered.length;
        filtered = filtered.filter((row) => {
          const value = getNestedValue(row, filterKey);
          
          // For numeric IDs, do exact match
          if (filterKey.includes('_id') || filterKey.includes('Id')) {
            const matches = String(value) === String(filterValue);
            if (filterKey === 'course.schedule_id') {
              
            }
            return matches;
          }
          
          // For status filter, handle comma-separated values
          if (filterKey === 'status') {
            if (filterValue === 'all') {
              return true; // Show all statuses
            }
            if (filterValue.includes(',')) {
              const statusValues = filterValue.split(',').map(s => s.trim());
              const matches = statusValues.includes(String(value));
              
              return matches;
            } else {
              const matches = String(value) === String(filterValue);
              
              return matches;
            }
          }
          
          // For other fields, do substring match
          const matches = String(value).toLowerCase().includes(filterValue.toLowerCase());
          if (filterKey === 'course.schedule_id') {
            
          }
          return matches;
        });
        
      }
    });
    
    
    return filtered;
  }, [data, searchTerm, filters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Group data
  const groupedData = useMemo(() => {
    if (groupBy === "none") return sortedData;
    
    const groups: { [key: string]: any[] } = {};
    
    sortedData.forEach((row) => {
      // Handle dot notation for nested properties
      const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
      };
      
      const groupValue = getNestedValue(row, groupBy);
      const groupKey = String(groupValue || "Unknown");
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });
    
    return groups;
  }, [sortedData, groupBy]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    if (!pagination) return groupedData;
    
    const startIndex = (currentPage - 1) * currentPageSize;
    const endIndex = startIndex + currentPageSize;
    
    if (Array.isArray(groupedData)) {
      return groupedData.slice(startIndex, endIndex);
    } else {
      // Handle grouped data (object with arrays)
      const entries = Object.entries(groupedData);
      const paginatedEntries = entries.slice(startIndex, endIndex);
      return Object.fromEntries(paginatedEntries);
    }
  }, [groupedData, currentPage, currentPageSize, pagination]);

  const totalPages = useMemo(() => {
    if (!pagination) return 1;
    
    const dataLength = Array.isArray(groupedData) 
      ? groupedData.length 
      : Object.values(groupedData).flat().length;
    
    return Math.ceil(dataLength / currentPageSize);
  }, [groupedData, currentPageSize, pagination]);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data, searchTerm, filters]);

  // Reset to first page when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentPageSize]);

  // Handle column sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  // Handle group expansion
  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Handle row selection
  const handleRowSelect = (rowId: number, selected: boolean) => {
    const newSelected = new Set(selectedRows);
    if (selected) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);
    onRowSelect?.(rowId, selected);
  };

  // Handle select all
  const handleSelectAll = () => {
    const allIds = groupBy === "none" 
      ? sortedData.map(row => row.id)
      : Object.values(groupedData).flat().map(row => row.id);
    
    if (selectedRows.size === allIds.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(allIds));
    }
  };

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
    return columns.filter(col => visibleColumns.has(col.key));
  };

  // Render grouped data
  const renderGroupedData = () => {
    if (groupBy === "none") {
      return renderRows(Array.isArray(paginatedData) ? paginatedData : []);
    }

    return Object.entries(paginatedData as Record<string, any[]>).map(([groupKey, rows]) => {
      const isExpanded = expandedGroups.has(groupKey);
      const groupCount = rows.length;
      
      return (
        <div key={groupKey} className="border-b border-border">
          <div 
            className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors"
            onClick={() => toggleGroup(groupKey)}
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">{groupKey}</span>
              <Badge variant="secondary">{groupCount} items</Badge>
            </div>
          </div>
          {isExpanded && (
            <div className="bg-card">
              {renderRows(rows)}
            </div>
          )}
        </div>
      );
    });
  };

  // Render table rows
  const renderRows = (rows: any[]) => {
    return rows.map((row, index) => (
      <div
        key={row.id || index}
        className={`flex items-center border-b border-border hover:bg-muted/50 transition-colors group ${
          onRowClick ? "cursor-pointer" : ""
        }`}
        onClick={() => onRowClick?.(row)}
      >
        {selectable && (
          <div className="p-3">
            <Checkbox
              checked={selectedRows.has(row.id)}
              onCheckedChange={(checked) => handleRowSelect(row.id, checked as boolean)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        
        {getVisibleColumns().map((column) => {
          const value = row[column.key];
          const linkHref = column.linkTo ? column.linkTo(value, row) : null;
          
          return (
            <div
              key={column.key}
              className={`p-3 ${column.width ? '' : 'flex-1'}`}
              style={{ 
                width: column.width,
                flex: column.flex ? `${column.flex}` : undefined
              }}
            >
              {column.render ? (
                column.render(value, row)
              ) : linkHref ? (
                <RelatedDataLink href={linkHref}>
                  {String(value || "")}
                </RelatedDataLink>
              ) : (
                String(value || "")
              )}
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header - Only show if title or description is provided */}
      {(title && title !== "Data Table") || (description && description !== "Manage your data") ? (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
            {onExport && (
              <Button variant="outline" onClick={() => onExport(sortedData)}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Show only action buttons if no title/description */
        (onRefresh || onExport) && (
          <div className="flex justify-end">
            <div className="flex gap-2">
              {onRefresh && (
                <Button variant="outline" onClick={onRefresh} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              )}
              {onExport && (
                <Button variant="outline" onClick={() => onExport(sortedData)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        )
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {searchable && (
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Group by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  {groupOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {filterOptions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Columns className="w-4 h-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={visibleColumns.has(column.key)}
                      onCheckedChange={() => toggleColumnVisibility(column.key)}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectable && selectedRows.size > 0 && (
              <div className="flex gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedRows.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onBulkAction?.("delete", Array.from(selectedRows))}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showFilters && filterOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterOptions.map((filter) => (
                <div key={filter.key}>
                  <label className="text-sm font-medium">{filter.label}</label>
                  {filter.type === 'select' ? (
                    <Select 
                      value={filters[filter.key] || 'all'} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, [filter.key]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {filter.label}</SelectItem>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : filter.type === 'date' ? (
                    <Input
                      type="date"
                      value={filters[filter.key] || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, [filter.key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      placeholder={`Filter by ${filter.label.toLowerCase()}...`}
                      value={filters[filter.key] || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, [filter.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({})}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header - Desktop only */}
          <div className="hidden md:flex items-center border-b border-border bg-muted/50">
            {selectable && (
              <div className="p-3">
                <Checkbox
                  checked={selectedRows.size > 0 && selectedRows.size === (groupBy === "none" ? sortedData.length : Object.values(groupedData).flat().length)}
                  onCheckedChange={handleSelectAll}
                />
              </div>
            )}
            
            {getVisibleColumns().map((column) => (
              <div
                key={column.key}
                className={`p-3 font-medium text-foreground ${
                  column.sortable ? "cursor-pointer hover:bg-muted/70 transition-colors" : ""
                } ${column.width ? '' : 'flex-1'}`}
                style={{ 
                  width: column.width,
                  flex: column.flex ? `${column.flex}` : undefined
                }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sortColumn === column.key && (
                    <span className="text-xs">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Mobile view - show cards instead of table */}
              <div className="block md:hidden">
                {Array.isArray(groupedData) ? (
                  groupedData.map((row: any, index: number) => (
                    <div key={row.id || index} className="border-b border-border p-4 space-y-2 group">
                      {getVisibleColumns().slice(0, 3).map((column) => {
                        const value = getNestedValue(row, column.key);
                        const linkHref = column.linkTo ? column.linkTo(value, row) : null;
                        
                        return (
                          <div key={column.key} className="flex justify-between">
                            <span className="text-sm font-medium text-muted-foreground">{column.label}:</span>
                            <span className="text-sm text-foreground">
                              {column.render ? (
                                column.render(value, row)
                              ) : linkHref ? (
                                <RelatedDataLink href={linkHref}>
                                  {String(value || "")}
                                </RelatedDataLink>
                              ) : (
                                String(value || "")
                              )}
                            </span>
                          </div>
                        );
                      })}
                      {getVisibleColumns().length > 3 && (
                        <div className="pt-2 border-t border-border">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  Object.entries(groupedData).map(([groupKey, groupRows]: [string, any[]]) => (
                    <div key={groupKey} className="space-y-2">
                      <div className="font-medium text-sm text-muted-foreground p-2 bg-muted/70">
                        {groupKey}
                      </div>
                      {groupRows.map((row: any, index: number) => (
                        <div key={row.id || index} className="border-b border-border p-4 space-y-2 group">
                          {getVisibleColumns().slice(0, 3).map((column) => {
                            const value = getNestedValue(row, column.key);
                            const linkHref = column.linkTo ? column.linkTo(value, row) : null;
                            
                            return (
                              <div key={column.key} className="flex justify-between">
                                <span className="text-sm font-medium text-muted-foreground">{column.label}:</span>
                                <span className="text-sm text-foreground">
                                  {column.render ? (
                                    column.render(value, row)
                                  ) : linkHref ? (
                                    <RelatedDataLink href={linkHref}>
                                      {String(value || "")}
                                    </RelatedDataLink>
                                  ) : (
                                    String(value || "")
                                  )}
                                </span>
                              </div>
                            );
                          })}
                          {getVisibleColumns().length > 3 && (
                            <div className="pt-2 border-t border-border">
                              <Button variant="outline" size="sm" className="w-full">
                                View Details
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
              
              {/* Desktop view - show table */}
              <div className="hidden md:block">
                {renderGroupedData()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * currentPageSize) + 1} to {Math.min(currentPage * currentPageSize, Array.isArray(groupedData) ? groupedData.length : Object.values(groupedData).flat().length)} of {Array.isArray(groupedData) ? groupedData.length : Object.values(groupedData).flat().length} items
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={currentPageSize.toString()} onValueChange={(value) => setCurrentPageSize(parseInt(value))}>
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
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
