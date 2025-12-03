"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useItems, useDeleteItem, useVendors } from "@kit/hooks";
import type { Item } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function ItemsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: itemsResponse, isLoading } = useItems({ 
    page, 
    limit: 1000 // Fetch all for filtering, then paginate client-side
  });
  
  const { data: vendorsResponse } = useVendors({ limit: 1000 });
  const vendorMap = useMemo(() => {
    if (!vendorsResponse?.data) return new Map<number, string>();
    return new Map(vendorsResponse.data.map(v => [v.id, v.name]));
  }, [vendorsResponse?.data]);
  
  const filteredItems = useMemo(() => {
    if (!itemsResponse?.data) return [];
    return itemsResponse.data;
  }, [itemsResponse?.data]);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, page, pageSize]);
  
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const deleteMutation = useDeleteItem();

  const columns: ColumnDef<Item>[] = useMemo(() => [
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
      header: "Unit Price",
      cell: ({ row }) => row.original.unitPrice ? formatCurrency(row.original.unitPrice) : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "vendorId",
      header: "Vendor",
      cell: ({ row }) => {
        const vendorId = row.original.vendorId;
        if (vendorId && vendorMap.has(vendorId)) {
          return (
            <Badge variant="outline">
              {vendorMap.get(vendorId)}
            </Badge>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
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
  ], [vendorMap]);

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
        item.vendorId ? vendorMap.get(item.vendorId) || '' : '',
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
        item.vendorId ? vendorMap.get(item.vendorId) || '' : '',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items</h1>
          <p className="text-muted-foreground mt-2">
            Manage your inventory items and products
          </p>
        </div>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/items/create"
          data={paginatedItems}
          columns={columns}
          loading={isLoading}
          onRowClick={(item) => router.push(`/items/${item.id}`)}
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
            { value: "unitPrice", label: "Unit Price", type: "numeric" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="items"
          searchFields={["name", "sku", "category", "description"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredItems.length,
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

