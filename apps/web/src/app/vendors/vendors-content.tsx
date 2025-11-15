"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useVendors, useDeleteVendor } from "@kit/hooks";
import type { Vendor } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function VendorsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: vendorsResponse, isLoading } = useVendors({ 
    page, 
    limit: 1000 // Fetch all for filtering, then paginate client-side
  });
  
  const filteredVendors = useMemo(() => {
    if (!vendorsResponse?.data) return [];
    return vendorsResponse.data;
  }, [vendorsResponse?.data]);
  
  const paginatedVendors = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredVendors.slice(startIndex, startIndex + pageSize);
  }, [filteredVendors, page, pageSize]);
  
  const totalPages = Math.ceil(filteredVendors.length / pageSize);
  const deleteMutation = useDeleteVendor();

  const columns: ColumnDef<Vendor>[] = useMemo(() => [
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
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => row.original.address || <span className="text-muted-foreground">—</span>,
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
    if (!confirm("Are you sure you want to delete this vendor?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Vendor deleted successfully");
    } catch (error) {
      toast.error("Failed to delete vendor");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} vendor(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} vendor(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete vendors");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Vendor[], type: 'selected' | 'all') => {
    const vendorsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Email', 'Phone', 'Address', 'Contact Person', 'Notes', 'Status'].join(','),
      ...vendorsToCopy.map(v => [
        v.name,
        v.email || '',
        v.phone || '',
        v.address || '',
        v.contactPerson || '',
        v.notes || '',
        v.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${vendorsToCopy.length} vendor(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Vendor[], type: 'selected' | 'all') => {
    const vendorsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Email', 'Phone', 'Address', 'Contact Person', 'Notes', 'Status'].join(','),
      ...vendorsToExport.map(v => [
        v.name,
        v.email || '',
        v.phone || '',
        v.address || '',
        v.contactPerson || '',
        v.notes || '',
        v.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${vendorsToExport.length} vendor(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground mt-2">
            Manage your vendor contacts and information
          </p>
        </div>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/vendors/create"
          data={paginatedVendors}
          columns={columns}
          loading={isLoading}
          onRowClick={(vendor) => router.push(`/vendors/${vendor.id}`)}
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
          localStoragePrefix="vendors"
          searchFields={["name", "email", "phone", "contactPerson", "address"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredVendors.length,
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

