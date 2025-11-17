"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useSupplierCatalogs, useDeleteSupplierCatalog, useInventorySuppliers, useIngredients } from "@kit/hooks";
import type { SupplierCatalog } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function SupplierCatalogsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: catalogsResponse, isLoading } = useSupplierCatalogs({ 
    page, 
    limit: 1000
  });
  
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const { data: ingredientsResponse } = useIngredients({ limit: 1000 });
  
  const supplierMap = useMemo(() => {
    if (!suppliersResponse?.data) return new Map<number, string>();
    return new Map(suppliersResponse.data.map(s => [s.id, s.name]));
  }, [suppliersResponse?.data]);
  
  const ingredientMap = useMemo(() => {
    if (!ingredientsResponse?.data) return new Map<number, string>();
    return new Map(ingredientsResponse.data.map(i => [i.id, i.name]));
  }, [ingredientsResponse?.data]);
  
  const filteredCatalogs = useMemo(() => {
    if (!catalogsResponse?.data) return [];
    return catalogsResponse.data;
  }, [catalogsResponse?.data]);
  
  const paginatedCatalogs = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredCatalogs.slice(startIndex, startIndex + pageSize);
  }, [filteredCatalogs, page, pageSize]);
  
  const totalPages = Math.ceil(filteredCatalogs.length / pageSize);
  const deleteMutation = useDeleteSupplierCatalog();

  const columns: ColumnDef<SupplierCatalog>[] = useMemo(() => [
    {
      accessorKey: "supplierId",
      header: "Supplier",
      cell: ({ row }) => {
        const supplierId = row.original.supplierId;
        if (supplierId && supplierMap.has(supplierId)) {
          return (
            <Badge variant="outline">
              {supplierMap.get(supplierId)}
            </Badge>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
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
      accessorKey: "unitPrice",
      header: "Unit Price",
      cell: ({ row }) => formatCurrency(row.original.unitPrice),
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => row.original.unit,
    },
    {
      accessorKey: "leadTimeDays",
      header: "Lead Time",
      cell: ({ row }) => row.original.leadTimeDays ? `${row.original.leadTimeDays} days` : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "effectiveDate",
      header: "Effective Date",
      cell: ({ row }) => formatDate(row.original.effectiveDate),
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
  ], [supplierMap, ingredientMap]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this supplier catalog entry?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Supplier catalog entry deleted successfully");
    } catch (error) {
      toast.error("Failed to delete supplier catalog entry");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} supplier catalog entry(ies)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} supplier catalog entry(ies) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete supplier catalog entries");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: SupplierCatalog[], type: 'selected' | 'all') => {
    const catalogsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Supplier', 'Ingredient', 'Unit Price', 'Unit', 'Lead Time', 'Status'].join(','),
      ...catalogsToCopy.map(catalog => [
        supplierMap.get(catalog.supplierId) || '',
        ingredientMap.get(catalog.ingredientId) || '',
        catalog.unitPrice,
        catalog.unit,
        catalog.leadTimeDays || '',
        catalog.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${catalogsToCopy.length} supplier catalog entry(ies) copied to clipboard`);
  };

  const handleBulkExport = (data: SupplierCatalog[], type: 'selected' | 'all') => {
    const catalogsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Supplier', 'Ingredient', 'Unit Price', 'Unit', 'Lead Time', 'Status'].join(','),
      ...catalogsToExport.map(catalog => [
        supplierMap.get(catalog.supplierId) || '',
        ingredientMap.get(catalog.ingredientId) || '',
        catalog.unitPrice,
        catalog.unit,
        catalog.leadTimeDays || '',
        catalog.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-catalogs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${catalogsToExport.length} supplier catalog entry(ies) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Catalogs</h1>
          <p className="text-muted-foreground mt-2">
            Manage supplier catalogs and ingredient prices
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/supplier-catalogs/create"
          data={paginatedCatalogs}
          columns={columns}
          loading={isLoading}
          onRowClick={(catalog) => router.push(`/supplier-catalogs/${catalog.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "isActive", label: "Status" },
          ]}
          sortColumns={[
            { value: "unitPrice", label: "Unit Price", type: "numeric" },
            { value: "effectiveDate", label: "Effective Date", type: "date" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="supplier-catalogs"
          searchFields={["supplierSku"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredCatalogs.length,
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

