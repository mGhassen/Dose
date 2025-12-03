"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useEntries, useDeleteEntry } from "@kit/hooks";
import type { Entry } from "@kit/lib";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function LoansInputContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: entriesData, isLoading } = useEntries({ 
    direction: 'input', 
    entryType: 'loan',
    includePayments: true,
    page,
    limit: pageSize
  });
  const deleteMutation = useDeleteEntry();

  const entries = entriesData?.data || [];
  const totalCount = entriesData?.pagination?.total || 0;

  const columns: ColumnDef<Entry>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Loan Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Principal Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "entryDate",
      header: "Received Date",
      cell: ({ row }) => formatDate(row.original.entryDate),
    },
    {
      accessorKey: "payments",
      header: "Payment Status",
      cell: ({ row }) => {
        const payments = row.original.payments || [];
        const totalPaid = payments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
        const isFullyPaid = totalPaid >= row.original.amount;
        const hasPartialPayment = totalPaid > 0 && !isFullyPaid;
        
        if (isFullyPaid) {
          return <Badge variant="default">Fully Paid</Badge>;
        } else if (hasPartialPayment) {
          return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Partially Paid</Badge>;
        } else {
          return <Badge variant="secondary">Pending Payment</Badge>;
        }
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-[200px] truncate">
          {row.original.description}
        </div>
      ),
    },
  ], []);

  const handleDelete = async (entry: Entry) => {
    try {
      await deleteMutation.mutateAsync(entry.id.toString());
      toast.success("Loan entry deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete loan entry");
    }
  };

  const handleBulkDelete = async (entries: Entry[]) => {
    try {
      await Promise.all(entries.map(entry => deleteMutation.mutateAsync(entry.id.toString())));
      toast.success(`${entries.length} loan entry(ies) deleted successfully`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete loan entries");
    }
  };

  const handleBulkCopy = async (entries: Entry[]) => {
    const text = entries.map(entry => 
      `${entry.name}\t${formatCurrency(entry.amount)}\t${formatDate(entry.entryDate)}`
    ).join('\n');
    
    await navigator.clipboard.writeText(text);
    toast.success(`${entries.length} loan entry(ies) copied to clipboard`);
  };

  const handleBulkExport = async (entries: Entry[]) => {
    const csv = [
      ['Loan Name', 'Principal Amount', 'Received Date', 'Description'].join(','),
      ...entries.map(entry => [
        `"${entry.name}"`,
        entry.amount,
        entry.entryDate,
        `"${entry.description || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loans-input-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${entries.length} loan entry(ies) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans - Money Received</h1>
          <p className="text-muted-foreground mt-2">
            All loan principals received (money coming in from loans)
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Loans</div>
          <div className="mt-2 text-2xl font-bold">{totalCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Principal</div>
          <div className="mt-2 text-2xl font-bold">
            {formatCurrency(entries.reduce((sum, e) => sum + e.amount, 0))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Fully Paid</div>
          <div className="mt-2 text-2xl font-bold">
            {entries.filter(e => {
              const payments = e.payments || [];
              const totalPaid = payments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
              return totalPaid >= e.amount;
            }).length}
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
          data={entries}
          columns={columns}
          loading={isLoading}
          onRowClick={(entry) => {
            if (entry.referenceId) {
              router.push(`/loans/${entry.referenceId}`);
            }
          }}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[]}
          sortColumns={[
            { value: "name", label: "Loan Name", type: "character varying" },
            { value: "amount", label: "Principal Amount", type: "numeric" },
            { value: "entryDate", label: "Received Date", type: "date" },
          ]}
          localStoragePrefix="loans-input"
          searchFields={["name", "description"]}
        />
      </div>
    </div>
  );
}

