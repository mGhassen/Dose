"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useIngredients, useDeleteIngredient } from "@kit/hooks";
import type { Ingredient } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { Package, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@kit/ui/button";

export default function IngredientsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: ingredientsResponse, isLoading } = useIngredients({ 
    page, 
    limit: 1000
  });
  
  const ingredients = ingredientsResponse?.data || [];
  const totalCount = ingredientsResponse?.pagination?.total || ingredients.length;
  const totalPages = ingredientsResponse?.pagination?.totalPages || Math.ceil(ingredients.length / pageSize);
  const deleteMutation = useDeleteIngredient();
  
  // Calculate summary stats
  const activeCount = useMemo(() => {
    return ingredients.filter(i => i.isActive).length;
  }, [ingredients]);
  
  const categoryCount = useMemo(() => {
    return new Set(ingredients.map(i => i.category).filter(Boolean)).size;
  }, [ingredients]);

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
            Manage your inventory ingredients for your coffee shop
          </p>
        </div>
        <Link href="/ingredients/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              All ingredients in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Ingredients</CardTitle>
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
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryCount}</div>
            <p className="text-xs text-muted-foreground">
              Unique categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount - activeCount}</div>
            <p className="text-xs text-muted-foreground">
              Inactive ingredients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/ingredients/create"
          data={ingredients}
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

