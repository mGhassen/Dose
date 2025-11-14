"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { Badge } from "@kit/ui/badge";
import { Separator } from "@kit/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kit/ui/popover";
import { Calendar } from "@kit/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Filter, X, Search, RotateCcw, ChevronDown } from "lucide-react";
import { cn } from "@kit/lib/utils";
import { useDebounce } from "@kit/hooks";

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'multiselect';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  searchable?: boolean;
}

export interface FilterState {
  [key: string]: string | string[] | Date | undefined;
}

interface UnifiedFilterProps {
  options: FilterOption[];
  onFilterChange: (filters: FilterState, searchTerm: string) => void;
  initialFilters?: FilterState;
  initialSearch?: string;
  className?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchKey?: string;
}

export function UnifiedFilter({
  options,
  onFilterChange,
  initialFilters = {},
  initialSearch = "",
  className = "",
  showSearch = true,
  searchPlaceholder = "Search...",
  searchKey = "search"
}: UnifiedFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedFilters = useDebounce(filters, 300);

  // Initialize from URL params
  useEffect(() => {
    const urlFilters: FilterState = {};
    const urlSearch = searchParams.get(searchKey) || "";
    
    options.forEach(option => {
      const paramValue = searchParams.get(option.key);
      if (paramValue) {
        if (option.type === 'multiselect') {
          urlFilters[option.key] = paramValue.split(',');
        } else if (option.type === 'date' || option.type === 'dateRange') {
          try {
            const parsedDate = new Date(paramValue);
            if (!isNaN(parsedDate.getTime())) {
              urlFilters[option.key] = parsedDate;
            }
          } catch (error) {
            console.warn(`Failed to parse date parameter ${option.key}:`, paramValue);
          }
        } else {
          urlFilters[option.key] = paramValue;
        }
      }
    });
    
    setFilters(urlFilters);
    setSearchTerm(urlSearch);
    
    // Show filters if there are URL params
    if (Object.keys(urlFilters).length > 0 || urlSearch) {
      setIsExpanded(true);
    }
  }, [searchParams, options, searchKey]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    // Clear existing filter params
    options.forEach(option => {
      params.delete(option.key);
    });
    params.delete(searchKey);
    
    // Add current filters
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else if (value instanceof Date) {
          // Only add valid dates to URL
          if (!isNaN(value.getTime())) {
            params.set(key, value.toISOString());
          }
        } else {
          params.set(key, String(value));
        }
      }
    });
    
    if (debouncedSearchTerm) {
      params.set(searchKey, debouncedSearchTerm);
    }
    
    // Update URL without triggering navigation
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [debouncedFilters, debouncedSearchTerm, searchParams, options, searchKey]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange(debouncedFilters, debouncedSearchTerm);
  }, [debouncedFilters, debouncedSearchTerm, onFilterChange]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm("");
    setIsExpanded(false);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => 
      value !== undefined && value !== "" && value !== null && value !== "all" && 
      (!Array.isArray(value) || value.length > 0)
    ) || searchTerm !== "";
  }, [filters, searchTerm]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.values(filters).forEach(value => {
      if (value !== undefined && value !== "" && value !== null && value !== "all") {
        if (Array.isArray(value)) {
          count += value.length;
        } else {
          count += 1;
        }
      }
    });
    if (searchTerm) count += 1;
    return count;
  }, [filters, searchTerm]);

  const renderFilterInput = (option: FilterOption) => {
    const value = filters[option.key];
    
    switch (option.type) {
      case 'select':
        return (
          <Select
            value={value as string || ""}
            onValueChange={(val) => handleFilterChange(option.key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={option.placeholder || `Select ${option.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {option.label}</SelectItem>
              {option.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'multiselect':
        const selectedValues = (value as string[]) || [];
        return (
          <Select
            value=""
            onValueChange={(val) => {
              if (val && !selectedValues.includes(val)) {
                handleFilterChange(option.key, [...selectedValues, val]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={option.placeholder || `Select ${option.label}`} />
            </SelectTrigger>
            <SelectContent>
              {option.options?.map((opt) => (
                <SelectItem 
                  key={opt.value} 
                  value={opt.value}
                  disabled={selectedValues.includes(opt.value)}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(value as Date, "PPP") : option.placeholder || "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value as Date}
                onSelect={(date) => handleFilterChange(option.key, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
        
      case 'dateRange':
        const dateValue = value as Date;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "PPP") : option.placeholder || "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => handleFilterChange(option.key, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
        
      default:
        return (
          <Input
            placeholder={option.placeholder || `Filter by ${option.label.toLowerCase()}...`}
            value={value as string || ""}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // Force immediate update (bypass debounce)
                const filterValue = e.currentTarget.value;
                const updatedFilters = { ...filters, [option.key]: filterValue };
                setFilters(updatedFilters);
                onFilterChange(updatedFilters, searchTerm);
              }
            }}
          />
        );
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filter Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Force immediate update (bypass debounce)
                      const currentSearch = e.currentTarget.value;
                      setSearchTerm(currentSearch);
                      onFilterChange(filters, currentSearch);
                    }
                  }}
                  className="pl-10"
                />
              </div>
            )}

            {/* Filter Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {options.map((option) => (
                <div key={option.key} className="space-y-2">
                  <Label htmlFor={option.key}>{option.label}</Label>
                  {renderFilterInput(option)}
                  
                  {/* Multi-select tags */}
                  {option.type === 'multiselect' && (filters[option.key] as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(filters[option.key] as string[]).map((val) => (
                        <Badge
                          key={val}
                          variant="secondary"
                          className="text-xs"
                        >
                          {option.options?.find(opt => opt.value === val)?.label || val}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1 hover:bg-transparent"
                            onClick={() => {
                              const newValues = (filters[option.key] as string[]).filter(v => v !== val);
                              handleFilterChange(option.key, newValues);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Active filters: {activeFilterCount}</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}