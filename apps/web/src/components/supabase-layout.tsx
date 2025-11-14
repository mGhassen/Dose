"use client";

import { useState } from "react";
import { Button } from "@smartlogbook/ui/button";
import { 
  Filter,
  ArrowDownUp,
  Plus,
  ChevronDown
} from "lucide-react";

interface SupabaseLayoutProps {
  title: string;
  children: React.ReactNode;
  onCreateClick?: () => void;
  createLabel?: string;
}

export function SupabaseLayout({ 
  title, 
  children, 
  onCreateClick, 
  createLabel = "Insert" 
}: SupabaseLayoutProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSorts, setShowSorts] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <div className="bg-muted/50 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-muted-foreground rounded"></div>
            </div>
            <span className="text-lg font-medium">{title}</span>
            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
              <Plus className="w-3 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="bg-muted border-border text-foreground hover:bg-muted/70">
              RLS policies
              <span className="ml-2 bg-blue-600 text-foreground text-xs px-1.5 py-0.5 rounded">4</span>
            </Button>
            <Button variant="outline" size="sm" className="bg-muted border-border text-foreground hover:bg-muted/70">
              Enable Realtime
            </Button>
            <Button variant="outline" size="sm" className="bg-muted border-border text-foreground hover:bg-muted/70">
              Role postgres
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Secondary Action Bar */}
      <div className="bg-muted/70 border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-muted border-border text-foreground hover:bg-muted/70"
              onClick={() => {
                setShowFilters(!showFilters);
                setShowSorts(false);
              }}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-muted border-border text-foreground hover:bg-muted/70"
              onClick={() => {
                setShowSorts(!showSorts);
                setShowFilters(false);
              }}
            >
              <ArrowDownUp className="w-4 h-4 mr-1" />
              Sort
            </Button>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-700 text-foreground"
            onClick={onCreateClick}
          >
            <ChevronDown className="w-4 h-4 mr-1" />
            {createLabel}
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card border-b border-border p-6">
          <div className="text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">No filters applied to this view</h3>
              <p className="text-muted-foreground">Add a column below to filter the view</p>
            </div>
            
            <Button
              variant="outline"
              className="border-dashed border-2 border-border hover:border-muted-foreground text-foreground"
              onClick={() => {}}
            >
              + Add filter
            </Button>
            
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                disabled
                className="opacity-50 bg-muted border-border text-foreground"
              >
                Apply filter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sort Panel */}
      {showSorts && (
        <div className="bg-card border-b border-border p-6">
          <div className="text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">No sorts applied to this view</h3>
              <p className="text-muted-foreground">Add a column below to sort the view</p>
            </div>
            
            <div className="mb-4">
              <Button
                variant="outline"
                className="border-dashed border-2 border-border hover:border-muted-foreground w-full justify-between text-foreground"
                onClick={() => {}}
              >
                <span>Pick a column to sort by</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                disabled
                className="opacity-50 bg-muted border-border text-foreground"
              >
                Apply sorting
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-background">
        {children}
      </div>
    </div>
  );
}
