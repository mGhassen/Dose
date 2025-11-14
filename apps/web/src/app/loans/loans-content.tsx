"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useLoans, useDeleteLoan } from "@kit/hooks";
import type { Loan, LoanStatus } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function LoansContent() {
  const router = useRouter();
  const { data: loans, isLoading } = useLoans();
  const deleteMutation = useDeleteLoan();

  const columns: ColumnDef<Loan>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "loanNumber",
      header: "Loan Number",
      cell: ({ row }) => row.original.loanNumber,
    },
    {
      accessorKey: "principalAmount",
      header: "Principal",
      cell: ({ row }) => formatCurrency(row.original.principalAmount),
    },
    {
      accessorKey: "interestRate",
      header: "Interest Rate",
      cell: ({ row }) => `${row.original.interestRate}%`,
    },
    {
      accessorKey: "durationMonths",
      header: "Duration",
      cell: ({ row }) => `${row.original.durationMonths} months`,
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const statusLabels: Record<LoanStatus, string> = {
          active: "Active",
          paid_off: "Paid Off",
          defaulted: "Defaulted",
        };
        const variants: Record<LoanStatus, "default" | "secondary" | "destructive"> = {
          active: "default",
          paid_off: "secondary",
          defaulted: "destructive",
        };
        return (
          <Badge variant={variants[status]}>
            {statusLabels[status] || status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "lender",
      header: "Lender",
      cell: ({ row }) => row.original.lender || <span className="text-muted-foreground">—</span>,
    },
  ], []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this loan?")) return;
    
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Loan deleted successfully");
    } catch (error) {
      toast.error("Failed to delete loan");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} loan(s)?`)) return;
    
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} loan(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete loans");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Loan[], type: 'selected' | 'all') => {
    const loansToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Loan Number', 'Principal Amount', 'Interest Rate', 'Duration (Months)', 'Start Date', 'Status', 'Lender', 'Description'].join(','),
      ...loansToCopy.map(loan => [
        loan.name,
        loan.loanNumber,
        loan.principalAmount,
        loan.interestRate,
        loan.durationMonths,
        loan.startDate,
        loan.status,
        loan.lender || '',
        loan.description || '',
      ].join(','))
    ].join('\n');
    
    navigator.clipboard.writeText(csv);
    toast.success(`${loansToCopy.length} loan(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Loan[], type: 'selected' | 'all') => {
    const loansToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'Loan Number', 'Principal Amount', 'Interest Rate', 'Duration (Months)', 'Start Date', 'Status', 'Lender', 'Description'].join(','),
      ...loansToExport.map(loan => [
        loan.name,
        loan.loanNumber,
        loan.principalAmount,
        loan.interestRate,
        loan.durationMonths,
        loan.startDate,
        loan.status,
        loan.lender || '',
        loan.description || '',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loans-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${loansToExport.length} loan(s) exported`);
  };

  return (
    <DataTablePage
      title="Loans"
      description="Manage your loans and credit facilities"
      createHref="/loans/create"
      data={loans || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(loan) => router.push(`/loans/${loan.id}`)}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onBulkCopy={handleBulkCopy}
      onBulkExport={handleBulkExport}
      filterColumns={[
        { value: "status", label: "Status" },
      ]}
      sortColumns={[
        { value: "name", label: "Name", type: "character varying" },
        { value: "principalAmount", label: "Principal", type: "numeric" },
        { value: "startDate", label: "Start Date", type: "date" },
      ]}
      localStoragePrefix="loans"
      searchFields={["name", "loanNumber", "lender", "description"]}
    />
  );
}

