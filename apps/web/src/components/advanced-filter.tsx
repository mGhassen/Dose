"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { UnifiedSelector } from "@/components/unified-selector";
import { Calendar } from "@kit/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@kit/ui/popover";
import { Badge } from "@kit/ui/badge";
import { CalendarIcon, Filter, X, Search, ChevronDown, ChevronUp } from "lucide-react";
import { formatPrettyDate, formatMonthShort } from "@kit/lib/date-format";
import { cn } from "@kit/lib/utils";

interface AdvancedFilterProps {
  onFilterChange: (filters: any) => void;
  filterOptions?: {
    types?: string[];
    statuses?: string[];
    locations?: Array<{ id: number; name: string; code: string }>;
    users?: Array<{ id: number; name: string; email: string }>;
  };
  searchPlaceholder?: string;
  showDateRange?: boolean;
}

export function AdvancedFilter({
  onFilterChange,
  filterOptions = {},
  searchPlaceholder = "Search...",
  showDateRange = false
}: AdvancedFilterProps) {
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "",
    location: "",
    user: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (field: string, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      type: "",
      status: "",
      location: "",
      user: "",
      dateFrom: undefined,
      dateTo: undefined,
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== "" && value !== undefined
  );

  return (
    <div className="mb-6">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
              {Object.values(filters).filter(value => value !== "" && value !== undefined).length}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        
      </div>

      {/* Filter Card */}
      {isExpanded && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <CardDescription>
              Filter and search through your data
            </CardDescription>
          </CardHeader>
      
      <CardContent>
        {/* Basic Search */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
          
          {filterOptions.types && filterOptions.types.length > 0 && (
            <UnifiedSelector
              label=""
              type="type"
              items={filterOptions.types.map((t) => ({ id: t, name: t }))}
              selectedId={filters.type || undefined}
              onSelect={(item) => handleFilterChange('type', item.id === 0 ? '' : String(item.id))}
              placeholder="Filter by type"
            />
          )}
          {filterOptions.statuses && filterOptions.statuses.length > 0 && (
            <UnifiedSelector
              label=""
              type="status"
              items={filterOptions.statuses.map((s) => ({ id: s, name: s }))}
              selectedId={filters.status || undefined}
              onSelect={(item) => handleFilterChange('status', item.id === 0 ? '' : String(item.id))}
              placeholder="Filter by status"
            />
          )}

          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterOptions.locations && (
              <div>
                <UnifiedSelector
                  label="Location"
                  type="location"
                  items={filterOptions.locations.map((loc) => ({ ...loc, name: `${loc.name} (${loc.code})` }))}
                  selectedId={filters.location ? parseInt(filters.location) : undefined}
                  onSelect={(item) => handleFilterChange('location', item.id === 0 ? '' : String(item.id))}
                  placeholder="Select location"
                />
              </div>
            )}

            {filterOptions.users && (
              <div>
                <UnifiedSelector
                  label="User"
                  type="user"
                  items={filterOptions.users}
                  selectedId={filters.user ? parseInt(filters.user) : undefined}
                  onSelect={(item) => handleFilterChange('user', item.id === 0 ? '' : String(item.id))}
                  placeholder="Select user"
                  getDisplayName={(u) => `${(u as { name?: string }).name} (${(u as { email?: string }).email})`}
                />
              </div>
            )}

            {showDateRange && (
              <>
                <div>
                  <Label>Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? formatPrettyDate(filters.dateFrom) : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => handleFilterChange('dateFrom', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? formatPrettyDate(filters.dateTo) : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => handleFilterChange('dateTo', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
              {filters.search && (
                <Badge variant="secondary">
                  Search: {filters.search}
                </Badge>
              )}
              {filters.type && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  Type: {filters.type}
                </span>
              )}
              {filters.status && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                  Status: {filters.status}
                </span>
              )}
              {filters.location && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                  Location: {filterOptions.locations?.find(l => l.id.toString() === filters.location)?.name}
                </span>
              )}
              {filters.user && (
                <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs">
                  User: {filterOptions.users?.find(u => u.id.toString() === filters.user)?.name}
                </span>
              )}
              {filters.dateFrom && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                  From: {formatPrettyDate(filters.dateFrom)}
                </span>
              )}
              {filters.dateTo && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                  To: {formatPrettyDate(filters.dateTo)}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
        </Card>
      )}
    </div>
  );
}
