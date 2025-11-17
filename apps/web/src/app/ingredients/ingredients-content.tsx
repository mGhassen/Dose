"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useIngredients, useDeleteIngredient } from "@kit/hooks";
import type { Ingredient } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function IngredientsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: ingredientsResponse, isLoading } = useIngredients({ 
    page, 
    limit: 1000
  });
  
  const filteredIngredients = useMemo(() => {
    if (!ingredientsResponse?.data) return [];
    return ingredientsResponse.data;
  }, [ingredientsResponse?.data]);
  
  const paginatedIngredients = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredIngredients.slice(startIndex, startIndex + pageSize);
  }, [filteredIngredients, page, pageSize]);
  
  const totalPages = Math.ceil(filteredIngredients.length / pageSize);
  const deleteMutation = useDeleteIngredient();

  const columns: ColumnDef<Ingredient>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => row.original.unit,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this ingredient?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Ingredient deleted successfully");
    } catch (error) {
      toast.error("Failed to delete ingredient");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} ingredient(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} ingredient(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete ingredients");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Ingredient[], type: 'selected' | 'all') => {
    const ingredientsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Category', 'Unit', 'Description', 'Status'].join(','),
      ...ingredientsToCopy.map(ingredient => [
        ingredient.name,
        ingredient.category || '',
        ingredient.unit,
        ingredient.description || '',
        ingredient.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${ingredientsToCopy.length} ingredient(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Ingredient[], type: 'selected' | 'all') => {
    const ingredientsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Category', 'Unit', 'Description', 'Status'].join(','),
      ...ingredientsToExport.map(ingredient => [
        ingredient.name,
        ingredient.category || '',
        ingredient.unit,
        ingredient.description || '',
        ingredient.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingredients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${ingredientsToExport.length} ingredient(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ingredients</h1>
          <p className="text-muted-foreground mt-2">
            Manage your inventory ingredients
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/ingredients/create"
          data={paginatedIngredients}
          columns={columns}
          loading={isLoading}
          onRowClick={(ingredient) => router.push(`/ingredients/${ingredient.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "category", label: "Category" },
            { value: "isActive", label: "Status" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "unit", label: "Unit", type: "character varying" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="ingredients"
          searchFields={["name", "category", "description"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredIngredients.length,
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

