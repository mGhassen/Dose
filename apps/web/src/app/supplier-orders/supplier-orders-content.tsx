"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useSupplierOrders, useDeleteSupplierOrder, useInventorySuppliers } from "@kit/hooks";
import type { SupplierOrder } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";
import { SupplierOrderStatus } from "@kit/types";

export default function SupplierOrdersContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { data: ordersResponse, isLoading } = useSupplierOrders({ 
    page, 
    limit: 1000
  });
  
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  
  const supplierMap = useMemo(() => {
    if (!suppliersResponse?.data) return new Map<number, string>();
    return new Map(suppliersResponse.data.map(s => [s.id, s.name]));
  }, [suppliersResponse?.data]);
  
  const filteredOrders = useMemo(() => {
    if (!ordersResponse?.data) return [];
    return ordersResponse.data;
  }, [ordersResponse?.data]);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, page, pageSize]);
  
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const deleteMutation = useDeleteSupplierOrder();

  const getStatusBadge = (status: SupplierOrderStatus) => {
    const variants: Record<SupplierOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [SupplierOrderStatus.PENDING]: "outline",
      [SupplierOrderStatus.CONFIRMED]: "default",
      [SupplierOrderStatus.IN_TRANSIT]: "default",
      [SupplierOrderStatus.DELIVERED]: "default",
      [SupplierOrderStatus.CANCELLED]: "destructive",
    };
    return variants[status] || "secondary";
  };

  const columns: ColumnDef<SupplierOrder>[] = useMemo(() => [
    {
      accessorKey: "orderNumber",
      header: "Order Number",
      cell: ({ row }) => row.original.orderNumber || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "supplierId",
      header: "Supplier",
      cell: ({ row }) => {
        const supplierId = row.original.supplierId;
        if (supplierId && supplierMap.has(supplierId)) {
          return supplierMap.get(supplierId);
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "orderDate",
      header: "Order Date",
      cell: ({ row }) => formatDate(row.original.orderDate),
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: "Expected Delivery",
      cell: ({ row }) => row.original.expectedDeliveryDate ? formatDate(row.original.expectedDeliveryDate) : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusBadge(row.original.status)}>
          {row.original.status.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "Total Amount",
      cell: ({ row }) => row.original.totalAmount ? formatCurrency(row.original.totalAmount) : <span className="text-muted-foreground">—</span>,
    },
  ], [supplierMap]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this supplier order?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Supplier order deleted successfully");
    } catch (error) {
      toast.error("Failed to delete supplier order");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} supplier order(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} supplier order(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete supplier orders");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: SupplierOrder[], type: 'selected' | 'all') => {
    const ordersToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Order Number', 'Supplier', 'Order Date', 'Expected Delivery', 'Status', 'Total Amount'].join(','),
      ...ordersToCopy.map(order => [
        order.orderNumber || '',
        supplierMap.get(order.supplierId) || '',
        order.orderDate,
        order.expectedDeliveryDate || '',
        order.status,
        order.totalAmount || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${ordersToCopy.length} supplier order(s) copied to clipboard`);
  };

  const handleBulkExport = (data: SupplierOrder[], type: 'selected' | 'all') => {
    const ordersToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Order Number', 'Supplier', 'Order Date', 'Expected Delivery', 'Status', 'Total Amount'].join(','),
      ...ordersToExport.map(order => [
        order.orderNumber || '',
        supplierMap.get(order.supplierId) || '',
        order.orderDate,
        order.expectedDeliveryDate || '',
        order.status,
        order.totalAmount || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${ordersToExport.length} supplier order(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Orders</h1>
          <p className="text-muted-foreground mt-2">
            Manage supplier orders and deliveries
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/supplier-orders/create"
          data={paginatedOrders}
          columns={columns}
          loading={isLoading}
          onRowClick={(order) => router.push(`/supplier-orders/${order.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "status", label: "Status" },
          ]}
          sortColumns={[
            { value: "orderDate", label: "Order Date", type: "date" },
            { value: "totalAmount", label: "Total Amount", type: "numeric" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="supplier-orders"
          searchFields={["orderNumber"]}
          pagination={{
            page,
            pageSize,
            totalCount: filteredOrders.length,
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

