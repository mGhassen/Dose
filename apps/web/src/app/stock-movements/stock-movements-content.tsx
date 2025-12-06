"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useStockMovements, useDeleteStockMovement, useItems } from "@kit/hooks";
import type { StockMovement } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { StockMovementType } from "@kit/types";
import { ArrowUpDown, TrendingUp, TrendingDown, Package, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@kit/ui/button";

export default function StockMovementsContent() {
  const router = useRouter();
  
  const { data: movementsResponse, isLoading } = useStockMovements({ 
    limit: 1000
  });
  
  const { data: itemsResponse } = useItems({ limit: 1000 });
  
  const itemMap = useMemo(() => {
    if (!itemsResponse?.data) return new Map<number, string>();
    return new Map(itemsResponse.data.map(i => [i.id, i.name]));
  }, [itemsResponse?.data]);
  
  const movements = movementsResponse?.data || [];
  const totalCount = movementsResponse?.pagination?.total || movements.length;
  
  const filteredMovements = useMemo(() => {
    return movements;
  }, [movements]);
  const deleteMutation = useDeleteStockMovement();
  
  // Calculate summary stats
  const inMovements = useMemo(() => {
    return movements.filter(m => m.movementType === StockMovementType.IN).length;
  }, [movements]);
  
  const outMovements = useMemo(() => {
    return movements.filter(m => m.movementType === StockMovementType.OUT).length;
  }, [movements]);
  
  const wasteMovements = useMemo(() => {
    return movements.filter(m => m.movementType === StockMovementType.WASTE || m.movementType === StockMovementType.EXPIRED).length;
  }, [movements]);
  
  const totalInQuantity = useMemo(() => {
    return movements
      .filter(m => m.movementType === StockMovementType.IN)
      .reduce((sum, m) => sum + m.quantity, 0);
  }, [movements]);
  
  const totalOutQuantity = useMemo(() => {
    return movements
      .filter(m => m.movementType === StockMovementType.OUT)
      .reduce((sum, m) => sum + m.quantity, 0);
  }, [movements]);

  const getMovementTypeBadge = (type: StockMovementType) => {
    const variants: Record<StockMovementType, "default" | "secondary" | "destructive" | "outline"> = {
      [StockMovementType.IN]: "default",
      [StockMovementType.OUT]: "destructive",
      [StockMovementType.ADJUSTMENT]: "outline",
      [StockMovementType.TRANSFER]: "secondary",
      [StockMovementType.WASTE]: "destructive",
      [StockMovementType.EXPIRED]: "destructive",
    };
    return variants[type] || "secondary";
  };

  const columns: ColumnDef<StockMovement>[] = useMemo(() => [
    {
      accessorKey: "itemId",
      header: "Item",
      cell: ({ row }) => {
        const itemId = row.original.itemId || row.original.ingredientId;
        if (itemId && itemMap.has(itemId)) {
          return itemMap.get(itemId);
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "movementType",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={getMovementTypeBadge(row.original.movementType)}>
          {row.original.movementType.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ row }) => `${row.original.quantity} ${row.original.unit}`,
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => row.original.location || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "movementDate",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.movementDate),
    },
    {
      accessorKey: "referenceType",
      header: "Reference",
      cell: ({ row }) => row.original.referenceType ? `${row.original.referenceType} #${row.original.referenceId || ''}` : <span className="text-muted-foreground">—</span>,
    },
  ], [itemMap]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this stock movement?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Stock movement deleted successfully");
    } catch (error) {
      toast.error("Failed to delete stock movement");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} stock movement(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} stock movement(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete stock movements");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: StockMovement[], type: 'selected' | 'all') => {
    const movementsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Item', 'Type', 'Quantity', 'Unit', 'Location', 'Date', 'Reference'].join(','),
      ...movementsToCopy.map(movement => [
        itemMap.get(movement.itemId || movement.ingredientId) || '',
        movement.movementType,
        movement.quantity,
        movement.unit,
        movement.location || '',
        movement.movementDate,
        movement.referenceType ? `${movement.referenceType} #${movement.referenceId || ''}` : '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${movementsToCopy.length} stock movement(s) copied to clipboard`);
  };

  const handleBulkExport = (data: StockMovement[], type: 'selected' | 'all') => {
    const movementsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Item', 'Type', 'Quantity', 'Unit', 'Location', 'Date', 'Reference'].join(','),
      ...movementsToExport.map(movement => [
        itemMap.get(movement.itemId || movement.ingredientId) || '',
        movement.movementType,
        movement.quantity,
        movement.unit,
        movement.location || '',
        movement.movementDate,
        movement.referenceType ? `${movement.referenceType} #${movement.referenceId || ''}` : '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${movementsToExport.length} stock movement(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground mt-2">
            Track all inventory movements, receipts, usage, and waste
          </p>
        </div>
        <Link href="/stock-movements/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Record Movement
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              All movements tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inMovements}</div>
            <p className="text-xs text-muted-foreground">
              {totalInQuantity.toFixed(2)} units received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{outMovements}</div>
            <p className="text-xs text-muted-foreground">
              {totalOutQuantity.toFixed(2)} units used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waste/Expired</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{wasteMovements}</div>
            <p className="text-xs text-muted-foreground">
              Items lost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/stock-movements/create"
          data={filteredMovements}
          columns={columns}
          loading={isLoading}
          onRowClick={(movement) => router.push(`/stock-movements/${movement.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "movementType", label: "Movement Type" },
          ]}
          sortColumns={[
            { value: "movementDate", label: "Date", type: "timestamp" },
            { value: "quantity", label: "Quantity", type: "numeric" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="stock-movements"
          searchFields={["location", "notes"]}
        />
      </div>
    </div>
  );
}

