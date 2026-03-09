"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useItems, useDeleteItem, useInventorySuppliers } from "@kit/hooks";
import type { Item } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { StatusPin } from "@/components/status-pin";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function ItemsContent() {
  const router = useRouter();
  
  const { data: itemsResponse, isLoading } = useItems({ 
    limit: 1000 // Fetch all for filtering, then paginate client-side
  });
  
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const supplierMap = useMemo(() => {
    if (!suppliersResponse?.data) return new Map<number, string>();
    return new Map(suppliersResponse.data.map(s => [s.id, s.name]));
  }, [suppliersResponse?.data]);
  
  const filteredItems = useMemo(() => {
    if (!itemsResponse?.data) return [];
    return itemsResponse.data;
  }, [itemsResponse?.data]);
  const deleteMutation = useDeleteItem();

  const columns: ColumnDef<Item>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusPin active={row.original.isActive} size="sm" />
          <div className="font-medium">
            {row.original.name}
          </div>
          {row.original.itemType === 'recipe' && (
            <Badge variant="secondary" className="text-xs">Recipe</Badge>
          )}
          {row.original.itemType === 'product' && (
            <Badge variant="secondary" className="text-xs">Product</Badge>
          )}
          {row.original.itemType === 'item' && (
            <Badge variant="secondary" className="text-xs">Item</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => row.original.sku || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => row.original.unit || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "unitPrice",
      header: "Selling price",
      cell: ({ row }) => {
        if (row.original.itemType === 'recipe') {
          return row.original.servingSize ? `${row.original.servingSize} servings` : <span className="text-muted-foreground">—</span>;
        }
        return row.original.unitPrice != null ? formatCurrency(row.original.unitPrice) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "vendorId",
      header: "Vendor",
      cell: ({ row }) => {
        const vendorId = row.original.vendorId;
        if (vendorId && supplierMap.has(vendorId)) {
          return (
            <Badge variant="outline">
              {supplierMap.get(vendorId)}
            </Badge>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ], [supplierMap]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete item");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} item(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete items");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Item[], type: 'selected' | 'all') => {
    const itemsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'SKU', 'Category', 'Unit', 'Unit Price', 'Vendor', 'Description', 'Status'].join(','),
      ...itemsToCopy.map(item => [
        item.name,
        item.sku || '',
        item.category || '',
        item.unit || '',
        item.unitPrice || '',
        item.vendorId ? supplierMap.get(item.vendorId) || '' : '',
        item.description || '',
        item.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${itemsToCopy.length} item(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Item[], type: 'selected' | 'all') => {
    const itemsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'SKU', 'Category', 'Unit', 'Unit Price', 'Vendor', 'Description', 'Status'].join(','),
      ...itemsToExport.map(item => [
        item.name,
        item.sku || '',
        item.category || '',
        item.unit || '',
        item.unitPrice || '',
        item.vendorId ? supplierMap.get(item.vendorId) || '' : '',
        item.description || '',
        item.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${itemsToExport.length} item(s) exported`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items</h1>
          <p className="text-muted-foreground mt-2">
            Manage your inventory items and products
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
          title=""
          description=""
          createHref="/items/create"
          data={filteredItems}
          columns={columns}
          loading={isLoading}
          onRowClick={(item) => router.push(`/items/${item.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "name", label: "Name" },
            { value: "sku", label: "SKU" },
            { value: "itemType", label: "Type", type: "select", options: [{ value: "item", label: "Item" }, { value: "product", label: "Product" }, { value: "recipe", label: "Recipe" }] },
            { value: "category", label: "Category", type: "select" },
            { value: "unit", label: "Unit", type: "select" },
            { value: "unitPrice", label: "Selling price" },
            { value: "vendorId", label: "Vendor", type: "select" },
            { value: "isActive", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
            { value: "createdAt", label: "Created" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "sku", label: "SKU", type: "character varying" },
            { value: "itemType", label: "Type", type: "character varying" },
            { value: "category", label: "Category", type: "character varying" },
            { value: "unit", label: "Unit", type: "character varying" },
            { value: "unitPrice", label: "Selling price", type: "numeric" },
            { value: "vendorId", label: "Vendor", type: "numeric" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="items"
          searchFields={["name", "sku", "category", "description"]}
        />
      </div>
    </div>
  );
}

