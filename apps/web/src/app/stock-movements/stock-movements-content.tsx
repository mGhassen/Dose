"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useStockMovements, useDeleteStockMovement, useIngredients } from "@kit/hooks";
import type { StockMovement } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { StockMovementType } from "@kit/types";

export default function StockMovementsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: movementsResponse, isLoading } = useStockMovements({ 
    page, 
    limit: 1000
  });
  
  const { data: ingredientsResponse } = useIngredients({ limit: 1000 });
  
  const ingredientMap = useMemo(() => {
    if (!ingredientsResponse?.data) return new Map<number, string>();
    return new Map(ingredientsResponse.data.map(i => [i.id, i.name]));
  }, [ingredientsResponse?.data]);
  
  const filteredMovements = useMemo(() => {
    if (!movementsResponse?.data) return [];
    return movementsResponse.data;
  }, [movementsResponse?.data]);
  
  const paginatedMovements = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredMovements.slice(startIndex, startIndex + pageSize);
  }, [filteredMovements, page, pageSize]);
  
  const totalPages = Math.ceil(filteredMovements.length / pageSize);
  const deleteMutation = useDeleteStockMovement();

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
      accessorKey: "ingredientId",
      header: "Ingredient",
      cell: ({ row }) => {
        const ingredientId = row.original.ingredientId;
        if (ingredientId && ingredientMap.has(ingredientId)) {
          return ingredientMap.get(ingredientId);
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
  ], [ingredientMap]);

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
      ['Ingredient', 'Type', 'Quantity', 'Unit', 'Location', 'Date', 'Reference'].join(','),
      ...movementsToCopy.map(movement => [
        ingredientMap.get(movement.ingredientId) || '',
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
      ['Ingredient', 'Type', 'Quantity', 'Unit', 'Location', 'Date', 'Reference'].join(','),
      ...movementsToExport.map(movement => [
        ingredientMap.get(movement.ingredientId) || '',
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
            Track stock movements and inventory changes
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/stock-movements/create"
          data={paginatedMovements}
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
          pagination={{
            page,
            pageSize,
            totalCount: filteredMovements.length,
            totalPages,
            onPageChange: setPage,
            onPageSizeChange: (newSize) => {
              setPageSize(newSize);
              setPage(1);
            },
          }}
        />
      </div>
    </div>
  );
}

