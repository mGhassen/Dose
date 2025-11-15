"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useActualPayments, useDeleteActualPayment } from "@kit/hooks";
import type { ActualPayment } from "@kit/lib";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function OutputPaymentsContent() {
  const router = useRouter();
  const { data: payments, isLoading } = useActualPayments({ direction: 'output' });
  const deleteMutation = useDeleteActualPayment();

  const paymentTypeLabels: Record<string, string> = {
    loan: "Loan",
    leasing: "Leasing",
    expense: "Expense",
    subscription: "Subscription",
    sale: "Sale",
  };

  const columns: ColumnDef<ActualPayment>[] = useMemo(() => [
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }) => formatDate(row.original.paymentDate),
    },
    {
      accessorKey: "paymentType",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {paymentTypeLabels[row.original.paymentType] || row.original.paymentType}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <div className="font-semibold text-destructive">
          {formatCurrency(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: "month",
      header: "Month",
      cell: ({ row }) => {
        const [year, month] = row.original.month.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      },
    },
    {
      accessorKey: "referenceId",
      header: "Reference ID",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.referenceId}
        </span>
      ),
    },
    {
      accessorKey: "isPaid",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isPaid ? "default" : "secondary"}>
          {row.original.isPaid ? "Paid" : "Pending"}
        </Badge>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.notes || "—"}
        </span>
      ),
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;
    
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Payment deleted successfully");
    } catch (error) {
      toast.error("Failed to delete payment");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} payment(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} payment(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete payments");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: ActualPayment[], type: 'selected' | 'all') => {
    const paymentsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Payment Date', 'Type', 'Amount', 'Month', 'Reference ID', 'Status', 'Notes'].join(','),
      ...paymentsToCopy.map(p => [
        p.paymentDate,
        paymentTypeLabels[p.paymentType] || p.paymentType,
        p.amount,
        p.month,
        p.referenceId,
        p.isPaid ? 'Paid' : 'Pending',
        p.notes || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${paymentsToCopy.length} payment(s) copied to clipboard`);
  };

  const handleBulkExport = (data: ActualPayment[], type: 'selected' | 'all') => {
    const paymentsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Payment Date', 'Type', 'Amount', 'Month', 'Reference ID', 'Status', 'Notes'].join(','),
      ...paymentsToExport.map(p => [
        p.paymentDate,
        paymentTypeLabels[p.paymentType] || p.paymentType,
        p.amount,
        p.month,
        p.referenceId,
        p.isPaid ? 'Paid' : 'Pending',
        p.notes || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${paymentsToExport.length} payment(s) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Output Payments</h1>
          <p className="text-muted-foreground mt-2">
            Manage all output payments (money going out) - expenses, subscriptions, loans, leasing
          </p>
        </div>
      </div>

      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          createHref="/payments/output/create"
          data={payments || []}
          columns={columns}
          loading={isLoading}
          onRowClick={(payment) => router.push(`/payments/${payment.id}/edit`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "paymentType", label: "Type" },
            { value: "isPaid", label: "Status" },
          ]}
          sortColumns={[
            { value: "paymentDate", label: "Payment Date", type: "date" },
            { value: "amount", label: "Amount", type: "numeric" },
            { value: "month", label: "Month", type: "character varying" },
          ]}
          localStoragePrefix="output-payments"
          searchFields={["notes"]}
        />
      </div>
    </div>
  );
}

