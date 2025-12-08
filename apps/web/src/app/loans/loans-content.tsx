"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useLoans, useDeleteLoan, useInventorySuppliers } from "@kit/hooks";
import Link from "next/link";
import type { Loan, LoanStatus } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@kit/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function LoansContent() {
  const router = useRouter();
  const { data: loans, isLoading } = useLoans();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const suppliers = suppliersResponse?.data || [];
  const deleteMutation = useDeleteLoan();
  
  // Create a map of supplier IDs to suppliers for display
  const supplierMap = useMemo(() => {
    const map = new Map<number, typeof suppliers[0]>();
    if (suppliers && Array.isArray(suppliers)) {
      suppliers.forEach(supplier => map.set(supplier.id, supplier));
    }
    return map;
  }, [suppliers]);


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
      cell: ({ row }) => {
        const loan = row.original;
        if (loan.supplierId && supplierMap.has(loan.supplierId)) {
          const supplier = supplierMap.get(loan.supplierId)!;
          return (
            <Link
              href={`/inventory-suppliers/${loan.supplierId}`}
              className="text-primary hover:underline"
            >
              {supplier.name}
            </Link>
          );
        }
        return loan.lender || <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "offPaymentMonths",
      accessorKey: "offPaymentMonths",
      header: "Off-Payment Months",
      cell: ({ row }) => {
        const offPaymentMonths = row.original.offPaymentMonths || [];
        if (offPaymentMonths.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
            {offPaymentMonths.length} month{offPaymentMonths.length > 1 ? 's' : ''}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const loan = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/loans/${loan.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(loan.id);
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [router, supplierMap]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Loan deleted successfully");
    } catch (error) {
      toast.error("Failed to delete loan");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground mt-2">
            Manage and analyze your loans and debt obligations
          </p>
        </div>
      </div>

      {/* Table View */}
      <div className="-mx-4">
        <DataTablePage
          title=""
          description=""
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
      </div>
    </div>
  );
}

