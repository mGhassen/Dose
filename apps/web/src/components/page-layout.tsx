"use client";

import { ReactNode } from "react";
import { Button } from "@smartlogbook/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { Badge } from "@smartlogbook/ui/badge";
import { Plus, Download, RefreshCw } from "lucide-react";
import Link from "next/link";

interface PageLayoutProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  count?: number;
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
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  description,
  icon,
  count,
  createButton,
  exportButton,
  refreshButton,
  children,
  className = ""
}: PageLayoutProps) {
  return (
    <div className={`space-y-6 min-h-0 ${className}`}>
      {/* Page Header */}
      {(title || description) && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {icon && <div className="text-2xl">{icon}</div>}
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          {description && (
            <p className="text-muted-foreground text-lg">{description}</p>
          )}
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-6 min-h-0">
        {children}
      </div>
    </div>
  );
}

interface DataTableLayoutProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  count?: number;
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
  filters?: ReactNode;
  table: ReactNode;
  className?: string;
  showFilters?: boolean;
}

export function DataTableLayout({
  title,
  description,
  icon,
  count,
  createButton,
  exportButton,
  refreshButton,
  filters,
  table,
  className = "",
  showFilters = true
}: DataTableLayoutProps) {
  return (
    <div className={`space-y-6 min-h-0 max-w-full overflow-hidden ${className}`}>
      {/* Page Header */}
      {(title || description) && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {icon && <div className="text-2xl">{icon}</div>}
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          {description && (
            <p className="text-muted-foreground text-lg">{description}</p>
          )}
        </div>
      )}

      {/* Filters */}
      {filters && showFilters && (
        <div className="space-y-4">
          {filters}
        </div>
      )}

      {/* Data Table */}
      <div className="min-h-0 max-w-full overflow-hidden">
        {table}
      </div>
    </div>
  );
}