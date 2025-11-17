"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useStockLevels, useDeleteStockLevel, useIngredients } from "@kit/hooks";
import type { StockLevel } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function StockLevelsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: stockLevelsResponse, isLoading } = useStockLevels({ 
    page, 
    limit: 1000
  });
  
  const { data: ingredientsResponse } = useIngredients({ limit: 1000 });
  
  const ingredientMap = useMemo(() => {
    if (!ingredientsResponse?.data) return new Map<number, string>();
    return new Map(ingredientsResponse.data.map(i => [i.id, i.name]));
  }, [ingredientsResponse?.data]);
  
  const filteredStockLevels = useMemo(() => {
    if (!stockLevelsResponse?.data) return [];
    return stockLevelsResponse.data;
  }, [stockLevelsResponse?.data]);
  
  const paginatedStockLevels = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredStockLevels.slice(startIndex, startIndex + pageSize);
  }, [filteredStockLevels, page, pageSize]);
  
  const totalPages = Math.ceil(filteredStockLevels.length / pageSize);
  const deleteMutation = useDeleteStockLevel();

  const columns: ColumnDef<StockLevel>[] = useMemo(() => [
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
      accessorKey: "minimumStockLevel",
      header: "Min Stock",
      cell: ({ row }) => row.original.minimumStockLevel ? `${row.original.minimumStockLevel} ${row.original.unit}` : <span className="text-muted-foreground">—</span>,
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
  ], [ingredientMap]);

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
      ['Ingredient', 'Quantity', 'Unit', 'Location', 'Min Stock', 'Max Stock'].join(','),
      ...stockLevelsToCopy.map(level => [
        ingredientMap.get(level.ingredientId) || '',
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
      ['Ingredient', 'Quantity', 'Unit', 'Location', 'Min Stock', 'Max Stock'].join(','),
      ...stockLevelsToExport.map(level => [
        ingredientMap.get(level.ingredientId) || '',
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
            Manage current stock levels for ingredients
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/stock-levels/create"
          data={paginatedStockLevels}
          columns={columns}
          loading={isLoading}
          onRowClick={(level) => router.push(`/stock-levels/${level.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          sortColumns={[
            { value: "quantity", label: "Quantity", type: "numeric" },
            { value: "lastUpdated", label: "Last Updated", type: "timestamp" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="stock-levels"
          searchFields={["location"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredStockLevels.length,
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

