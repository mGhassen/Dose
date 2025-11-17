"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useInventorySuppliers, useDeleteInventorySupplier } from "@kit/hooks";
import type { Supplier } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function SuppliersContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: suppliersResponse, isLoading } = useInventorySuppliers({ 
    page, 
    limit: 1000
  });
  
  const filteredSuppliers = useMemo(() => {
    if (!suppliersResponse?.data) return [];
    return suppliersResponse.data;
  }, [suppliersResponse?.data]);
  
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredSuppliers.slice(startIndex, startIndex + pageSize);
  }, [filteredSuppliers, page, pageSize]);
  
  const totalPages = Math.ceil(filteredSuppliers.length / pageSize);
  const deleteMutation = useDeleteInventorySupplier();

  const columns: ColumnDef<Supplier>[] = useMemo(() => [
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
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "contactPerson",
      header: "Contact Person",
      cell: ({ row }) => row.original.contactPerson || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "paymentTerms",
      header: "Payment Terms",
      cell: ({ row }) => row.original.paymentTerms || <span className="text-muted-foreground">—</span>,
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
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Supplier deleted successfully");
    } catch (error) {
      toast.error("Failed to delete supplier");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} supplier(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} supplier(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete suppliers");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Supplier[], type: 'selected' | 'all') => {
    const suppliersToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Email', 'Phone', 'Contact Person', 'Payment Terms', 'Status'].join(','),
      ...suppliersToCopy.map(supplier => [
        supplier.name,
        supplier.email || '',
        supplier.phone || '',
        supplier.contactPerson || '',
        supplier.paymentTerms || '',
        supplier.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${suppliersToCopy.length} supplier(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Supplier[], type: 'selected' | 'all') => {
    const suppliersToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Email', 'Phone', 'Contact Person', 'Payment Terms', 'Status'].join(','),
      ...suppliersToExport.map(supplier => [
        supplier.name,
        supplier.email || '',
        supplier.phone || '',
        supplier.contactPerson || '',
        supplier.paymentTerms || '',
        supplier.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${suppliersToExport.length} supplier(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your inventory suppliers
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/inventory-suppliers/create"
          data={paginatedSuppliers}
          columns={columns}
          loading={isLoading}
          onRowClick={(supplier) => router.push(`/inventory-suppliers/${supplier.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "isActive", label: "Status" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="inventory-suppliers"
          searchFields={["name", "email", "phone", "contactPerson"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredSuppliers.length,
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

