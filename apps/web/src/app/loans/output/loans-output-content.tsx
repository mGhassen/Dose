"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useEntries, useDeleteEntry, useLoans } from "@kit/hooks";
import type { Entry } from "@kit/lib";
import type { Loan } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { Label } from "@kit/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function LoansOutputContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoanSelectDialogOpen, setIsLoanSelectDialogOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  
  const { data: entriesData, isLoading } = useEntries({ 
    direction: 'output', 
    entryType: 'loan_payment',
    includePayments: true,
    page,
    limit: pageSize
  });
  const deleteMutation = useDeleteEntry();
  const { data: loans } = useLoans();

  const handleInsert = () => {
    setIsLoanSelectDialogOpen(true);
  };

  const handleLoanSelect = () => {
    if (selectedLoanId) {
      router.push(`/loans/${selectedLoanId}/schedule`);
    }
  };

  const entries = entriesData?.data || [];
  const totalCount = entriesData?.pagination?.total || 0;

  const columns: ColumnDef<Entry>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Payment Description",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="text-sm text-muted-foreground mt-1">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Payment Amount",
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
          return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Partially Paid</Badge>;
        } else {
          const dueDate = row.original.dueDate ? new Date(row.original.dueDate) : new Date(row.original.entryDate);
          const isPastDue = dueDate < new Date();
          return <Badge variant={isPastDue ? "destructive" : "secondary"}>
            {isPastDue ? "Past Due" : "Pending Payment"}
          </Badge>;
        }
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => row.original.dueDate ? formatDate(row.original.dueDate) : formatDate(row.original.entryDate),
    },
  ], []);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Loan payment entry deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete loan payment entry");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} loan payment entry(ies) deleted successfully`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete loan payment entries");
    }
  };

  const handleBulkCopy = async (entries: Entry[]) => {
    const text = entries.map(entry => 
      `${entry.name}\t${formatCurrency(entry.amount)}\t${formatDate(entry.dueDate || entry.entryDate)}`
    ).join('\n');
    
    await navigator.clipboard.writeText(text);
    toast.success(`${entries.length} loan payment entry(ies) copied to clipboard`);
  };

  const handleBulkExport = async (entries: Entry[]) => {
    const csv = [
      ['Payment Description', 'Payment Amount', 'Amount Paid', 'Due Date', 'Description'].join(','),
      ...entries.map(entry => {
        const payments = entry.payments || [];
        const totalPaid = payments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
        return [
          `"${entry.name}"`,
          entry.amount,
          totalPaid,
          entry.dueDate || entry.entryDate,
          `"${entry.description || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loans-output-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${entries.length} loan payment entry(ies) exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loan Payments - Money to Pay</h1>
          <p className="text-muted-foreground mt-2">
            All loan payment schedules (money going out for loan repayments)
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Payments</div>
          <div className="mt-2 text-2xl font-bold">{totalCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Amount Due</div>
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
          onInsert={handleInsert}
          data={entries}
          columns={columns}
          loading={isLoading}
          onRowClick={(entry) => {
            if (entry.referenceId) {
              router.push(`/loans/${entry.referenceId}/schedule`);
            }
          }}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          filterColumns={[
            { value: "payments", label: "Payment Status" },
          ]}
          sortColumns={[
            { value: "name", label: "Payment Description", type: "character varying" },
            { value: "amount", label: "Payment Amount", type: "numeric" },
            { value: "dueDate", label: "Due Date", type: "date" },
          ]}
          localStoragePrefix="loans-output"
          searchFields={["name", "description"]}
        />
      </div>

      {/* Loan Selection Dialog */}
      <Dialog open={isLoanSelectDialogOpen} onOpenChange={setIsLoanSelectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Loan</DialogTitle>
            <DialogDescription>
              Choose a loan to view its schedule and make payments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="loan-select">Loan *</Label>
              <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
                <SelectTrigger id="loan-select">
                  <SelectValue placeholder="Choose a loan..." />
                </SelectTrigger>
                <SelectContent>
                  {loans?.map((loan: Loan) => (
                    <SelectItem key={loan.id} value={loan.id.toString()}>
                      {loan.name} ({loan.loanNumber}) - {formatCurrency(loan.principalAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsLoanSelectDialogOpen(false);
                setSelectedLoanId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLoanSelect}
              disabled={!selectedLoanId}
            >
              View Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
