"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useInventorySuppliers, useDeleteInventorySupplier } from "@kit/hooks";
import type { Supplier } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { Building2, CheckCircle, AlertCircle, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@kit/ui/button";

export default function SuppliersContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: suppliersResponse, isLoading } = useInventorySuppliers({ 
    page, 
    limit: 1000
  });
  
  const suppliers = suppliersResponse?.data || [];
  const totalCount = suppliersResponse?.pagination?.total || suppliers.length;
  const totalPages = suppliersResponse?.pagination?.totalPages || Math.ceil(suppliers.length / pageSize);
  const deleteMutation = useDeleteInventorySupplier();
  
  // Calculate summary stats
  const activeCount = useMemo(() => {
    return suppliers.filter(s => s.isActive).length;
  }, [suppliers]);
  
  const withContact = useMemo(() => {
    return suppliers.filter(s => s.email || s.phone).length;
  }, [suppliers]);

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
            Manage your coffee shop suppliers and vendors
          </p>
        </div>
        <Link href="/inventory-suppliers/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              All suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
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
            <CardTitle className="text-sm font-medium">With Contact</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withContact}</div>
            <p className="text-xs text-muted-foreground">
              Have contact info
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount - activeCount}</div>
            <p className="text-xs text-muted-foreground">
              Inactive suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/inventory-suppliers/create"
          data={suppliers}
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

