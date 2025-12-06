"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useRecipes, useDeleteRecipe } from "@kit/hooks";
import type { Recipe } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { ChefHat, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@kit/ui/button";

export default function RecipesContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: recipesResponse, isLoading } = useRecipes({ 
    page, 
    limit: 1000
  });
  
  const recipes = recipesResponse?.data || [];
  const totalCount = recipesResponse?.pagination?.total || recipes.length;
  const totalPages = recipesResponse?.pagination?.totalPages || Math.ceil(recipes.length / pageSize);
  const deleteMutation = useDeleteRecipe();
  
  // Calculate summary stats
  const activeCount = useMemo(() => {
    return recipes.filter(r => r.isActive).length;
  }, [recipes]);
  
  const avgPrepTime = useMemo(() => {
    const times = recipes.filter(r => r.preparationTime).map(r => r.preparationTime!);
    if (times.length === 0) return 0;
    return Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
  }, [recipes]);
  
  const avgCookTime = useMemo(() => {
    const times = recipes.filter(r => r.cookingTime).map(r => r.cookingTime!);
    if (times.length === 0) return 0;
    return Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
  }, [recipes]);

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
            Manage your coffee shop recipes and drink formulas
          </p>
        </div>
        <Link href="/recipes/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Recipe
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              All recipes in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recipes</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Prep Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPrepTime} min</div>
            <p className="text-xs text-muted-foreground">
              Average preparation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cook Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCookTime} min</div>
            <p className="text-xs text-muted-foreground">
              Average cooking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/recipes/create"
          data={recipes}
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
            totalCount,
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

