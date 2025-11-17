"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useRecipes, useDeleteRecipe } from "@kit/hooks";
import type { Recipe } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function RecipesContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: recipesResponse, isLoading } = useRecipes({ 
    page, 
    limit: 1000
  });
  
  const filteredRecipes = useMemo(() => {
    if (!recipesResponse?.data) return [];
    return recipesResponse.data;
  }, [recipesResponse?.data]);
  
  const paginatedRecipes = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredRecipes.slice(startIndex, startIndex + pageSize);
  }, [filteredRecipes, page, pageSize]);
  
  const totalPages = Math.ceil(filteredRecipes.length / pageSize);
  const deleteMutation = useDeleteRecipe();

  const columns: ColumnDef<Recipe>[] = useMemo(() => [
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
      accessorKey: "servingSize",
      header: "Serving Size",
      cell: ({ row }) => row.original.servingSize ? `${row.original.servingSize} servings` : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "preparationTime",
      header: "Prep Time",
      cell: ({ row }) => row.original.preparationTime ? `${row.original.preparationTime} min` : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "cookingTime",
      header: "Cook Time",
      cell: ({ row }) => row.original.cookingTime ? `${row.original.cookingTime} min` : <span className="text-muted-foreground">—</span>,
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
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Recipe deleted successfully");
    } catch (error) {
      toast.error("Failed to delete recipe");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} recipe(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} recipe(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete recipes");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Recipe[], type: 'selected' | 'all') => {
    const recipesToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Serving Size', 'Prep Time', 'Cook Time', 'Status'].join(','),
      ...recipesToCopy.map(recipe => [
        recipe.name,
        recipe.servingSize || '',
        recipe.preparationTime || '',
        recipe.cookingTime || '',
        recipe.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${recipesToCopy.length} recipe(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Recipe[], type: 'selected' | 'all') => {
    const recipesToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Serving Size', 'Prep Time', 'Cook Time', 'Status'].join(','),
      ...recipesToExport.map(recipe => [
        recipe.name,
        recipe.servingSize || '',
        recipe.preparationTime || '',
        recipe.cookingTime || '',
        recipe.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${recipesToExport.length} recipe(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
          <p className="text-muted-foreground mt-2">
            Manage your recipes and their ingredients
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/recipes/create"
          data={paginatedRecipes}
          columns={columns}
          loading={isLoading}
          onRowClick={(recipe) => router.push(`/recipes/${recipe.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "isActive", label: "Status" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "servingSize", label: "Serving Size", type: "integer" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="recipes"
          searchFields={["name", "description"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredRecipes.length,
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

