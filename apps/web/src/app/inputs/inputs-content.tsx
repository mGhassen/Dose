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

export default function InputsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data: entriesData, isLoading } = useEntries({ 
    direction: 'input', 
    includePayments: true,
    page,
    limit: pageSize
  });
  const deleteMutation = useDeleteEntry();

  const entries = entriesData?.data || [];
  const totalCount = entriesData?.pagination?.total || 0;

  const entryTypeLabels: Record<string, string> = {
    sale: "Sale",
    loan: "Loan",
    leasing: "Leasing",
  };

  const columns: ColumnDef<Entry>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "entryType",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.entryType;
        return (
          <Badge variant="outline">
            {entryTypeLabels[type] || type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      id: "amountPaid",
      accessorKey: "payments",
      header: "Amount Paid",
      cell: ({ row }) => {
        const payments = row.original.payments || [];
        const totalPaid = payments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
        return (
          <div className="font-medium">
            {formatCurrency(totalPaid)}
          </div>
        );
      },
    },
    {
      accessorKey: "entryDate",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.entryDate),
    },
    {
      id: "paymentStatus",
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
          return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700">Partially Paid</Badge>;
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
      toast.success("Entry deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete entry");
    }
  };

  const handleBulkDelete = async (entries: Entry[]) => {
    try {
      await Promise.all(entries.map(entry => deleteMutation.mutateAsync(entry.id.toString())));
      toast.success(`${entries.length} entry(ies) deleted successfully`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete entries");
    }
  };

  const handleBulkCopy = async (entries: Entry[]) => {
    const text = entries.map(entry => 
      `${entry.name}\t${entryTypeLabels[entry.entryType] || entry.entryType}\t${formatCurrency(entry.amount)}\t${formatDate(entry.entryDate)}`
    ).join('\n');
    
    await navigator.clipboard.writeText(text);
    toast.success(`${entries.length} entry(ies) copied to clipboard`);
  };

  const handleBulkExport = async (entries: Entry[]) => {
    const csv = [
      ['Name', 'Type', 'Amount', 'Amount Paid', 'Date', 'Payment Status', 'Description'].join(','),
      ...entries.map(entry => {
        const payments = entry.payments || [];
        const totalPaid = payments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
        const isFullyPaid = totalPaid >= entry.amount;
        const hasPartialPayment = totalPaid > 0 && !isFullyPaid;
        let status = "Pending Payment";
        if (isFullyPaid) {
          status = "Fully Paid";
        } else if (hasPartialPayment) {
          status = "Partially Paid";
        }
        return [
          `"${entry.name}"`,
          `"${entryTypeLabels[entry.entryType] || entry.entryType}"`,
          entry.amount,
          totalPaid,
          entry.entryDate,
          `"${status}"`,
          `"${entry.description || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inputs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${entries.length} entry(ies) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inputs</h1>
          <p className="text-muted-foreground mt-2">
            All money coming in - sales, loans, and other revenue sources
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Entries</div>
          <div className="mt-2 text-2xl font-bold">{totalCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Amount</div>
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
          onRowClick={(entry) => router.push(`/entries/${entry.id}`)}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "entryType", label: "Type" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "amount", label: "Amount", type: "numeric" },
            { value: "entryDate", label: "Date", type: "date" },
          ]}
          localStoragePrefix="inputs"
          searchFields={["name", "description"]}
          pagination={{
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
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

