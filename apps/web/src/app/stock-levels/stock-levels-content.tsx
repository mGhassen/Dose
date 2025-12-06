"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useStockLevels, useDeleteStockLevel, useItems } from "@kit/hooks";
import type { StockLevel } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { Package, AlertTriangle, CheckCircle, TrendingDown, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@kit/ui/button";

export default function StockLevelsContent() {
  const router = useRouter();
  
  const { data: stockLevelsResponse, isLoading } = useStockLevels({ 
    limit: 1000
  });
  
  const { data: itemsResponse } = useItems({ limit: 1000 });
  
  const itemMap = useMemo(() => {
    if (!itemsResponse?.data) return new Map<number, string>();
    // Include all items (raw + produced), not just items with itemType === 'item'
    return new Map(itemsResponse.data.map(i => [i.id, i.name]));
  }, [itemsResponse?.data]);
  
  const stockLevels = stockLevelsResponse?.data || [];
  const totalCount = stockLevelsResponse?.pagination?.total || stockLevels.length;
  
  const filteredStockLevels = useMemo(() => {
    return stockLevels;
  }, [stockLevels]);
  const deleteMutation = useDeleteStockLevel();
  
  // Calculate low stock items
  const lowStockItems = useMemo(() => {
    return stockLevels.filter(level => {
      if (!level.minimumStockLevel) return false;
      return level.quantity <= level.minimumStockLevel;
    });
  }, [stockLevels]);
  
  // Calculate out of stock items
  const outOfStockItems = useMemo(() => {
    return stockLevels.filter(level => level.quantity <= 0);
  }, [stockLevels]);
  
  // Calculate total inventory value (would need price data, simplified for now)
  const totalItems = useMemo(() => {
    return stockLevels.length;
  }, [stockLevels]);

  const columns: ColumnDef<StockLevel>[] = useMemo(() => [
    {
      accessorKey: "itemId",
      header: "Item",
      cell: ({ row }) => {
        const itemId = row.original.itemId;
        const level = row.original;
        const isLowStock = level.minimumStockLevel && level.quantity <= level.minimumStockLevel;
        const isOutOfStock = level.quantity <= 0;
        
        if (itemId && itemMap.has(itemId)) {
          return (
            <div className="flex items-center gap-2">
              <div className="font-medium">{itemMap.get(itemId)}</div>
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
              )}
              {!isOutOfStock && isLowStock && (
                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Low Stock</Badge>
              )}
            </div>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ row }) => {
        const level = row.original;
        const isLowStock = level.minimumStockLevel && level.quantity <= level.minimumStockLevel;
        const isOutOfStock = level.quantity <= 0;
        
        return (
          <div className={isOutOfStock ? "text-destructive font-medium" : isLowStock ? "text-orange-600 font-medium" : ""}>
            {`${level.quantity} ${level.unit}`}
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => row.original.location || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "minimumStockLevel",
      header: "Min Stock",
      cell: ({ row }) => {
        const level = row.original;
        const isLowStock = level.minimumStockLevel && level.quantity <= level.minimumStockLevel;
        return level.minimumStockLevel ? (
          <div className={isLowStock ? "text-orange-600 font-medium" : ""}>
            {`${level.minimumStockLevel} ${level.unit}`}
          </div>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "maximumStockLevel",
      header: "Max Stock",
      cell: ({ row }) => row.original.maximumStockLevel ? `${row.original.maximumStockLevel} ${row.original.unit}` : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "lastUpdated",
      header: "Last Updated",
      cell: ({ row }) => formatDate(row.original.lastUpdated),
    },
  ], [itemMap]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this stock level?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Stock level deleted successfully");
    } catch (error) {
      toast.error("Failed to delete stock level");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} stock level(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} stock level(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete stock levels");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: StockLevel[], type: 'selected' | 'all') => {
    const stockLevelsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Item', 'Quantity', 'Unit', 'Location', 'Min Stock', 'Max Stock'].join(','),
      ...stockLevelsToCopy.map(level => [
        itemMap.get(level.itemId) || '',
        level.quantity,
        level.unit,
        level.location || '',
        level.minimumStockLevel || '',
        level.maximumStockLevel || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${stockLevelsToCopy.length} stock level(s) copied to clipboard`);
  };

  const handleBulkExport = (data: StockLevel[], type: 'selected' | 'all') => {
    const stockLevelsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Item', 'Quantity', 'Unit', 'Location', 'Min Stock', 'Max Stock'].join(','),
      ...stockLevelsToExport.map(level => [
        itemMap.get(level.itemId) || '',
        level.quantity,
        level.unit,
        level.location || '',
        level.minimumStockLevel || '',
        level.maximumStockLevel || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-levels-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${stockLevelsToExport.length} stock level(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-muted-foreground mt-2">
            Monitor inventory levels and receive low stock alerts
          </p>
        </div>
        <Link href="/stock-levels/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Stock Level
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Items tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Need reordering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Urgent restock needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalItems - lowStockItems.length - outOfStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Adequate levels
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} {lowStockItems.length === 1 ? 'is' : 'are'} below minimum stock level. 
                Consider placing a supplier order.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/supplier-orders/create')}
              >
                Create Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/stock-levels/create"
          data={filteredStockLevels}
          columns={columns}
          loading={isLoading}
          onRowClick={(level) => router.push(`/stock-levels/${level.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "location", label: "Location" },
          ]}
          sortColumns={[
            { value: "quantity", label: "Quantity", type: "numeric" },
            { value: "lastUpdated", label: "Last Updated", type: "timestamp" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="stock-levels"
          searchFields={["location"]}
        />
      </div>
    </div>
  );
}

