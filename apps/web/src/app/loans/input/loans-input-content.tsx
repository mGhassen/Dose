"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useEntries, useDeleteEntry, usePaymentsByEntry, useCreatePayment, useDeletePayment } from "@kit/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { Entry } from "@kit/lib";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { UnifiedSelector } from "@/components/unified-selector";
import { Plus, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kit/ui/alert-dialog";
import { formatCurrency } from "@kit/lib/config";
import { dateToYYYYMMDD } from "@kit/lib";
import { formatDate } from "@kit/lib/date-format";
import { DatePicker } from "@kit/ui/date-picker";
import { toast } from "sonner";

export default function LoansInputContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [newPaymentDate, setNewPaymentDate] = useState<Date>(() => new Date());
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  const [isDeletePaymentDialogOpen, setIsDeletePaymentDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const { data: entriesData, isLoading } = useEntries({ 
    direction: 'input', 
    entryType: 'loan',
    includePayments: true,
    page,
    limit: pageSize
  });
  const deleteMutation = useDeleteEntry();
  
  // Fetch payments for selected entry - only fetch when entry is selected
  const { data: payments = [], refetch: refetchPayments } = usePaymentsByEntry(
    selectedEntry?.id?.toString() || ''
  );
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  // Refetch payments when dialog opens
  useEffect(() => {
    if (isPaymentDialogOpen && selectedEntry?.id) {
      refetchPayments();
    }
  }, [isPaymentDialogOpen, selectedEntry?.id, refetchPayments]);

  const entries = entriesData?.data || [];
  const totalCount = entriesData?.pagination?.total || 0;
  
  // Calculate payment totals for selected entry - include all payments (paid and unpaid)
  const totalPaid = selectedEntry ? (payments.reduce((sum, p) => sum + p.amount, 0)) : 0;
  const remainingToPay = selectedEntry ? Math.max(0, selectedEntry.amount - totalPaid) : 0;

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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setSelectedEntry(entry);
                setIsPaymentDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Manage Payments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Loan entry deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete loan entry");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(String(id))));
      toast.success(`${ids.length} loan entry(ies) deleted successfully`);
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

  const handleAddPayment = async (paidDate: string, amount: number, notes?: string) => {
    if (!selectedEntry) return;
    
    try {
      await createPayment.mutateAsync({
        entryId: selectedEntry.id,
        paymentDate: paidDate,
        amount: amount,
        isPaid: true,
        paidDate: paidDate,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
      });
      
      setIsPaymentDialogOpen(false);
      refetchPayments();
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success("Payment recorded successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to record payment");
    }
  };

  const handleDeletePaymentClick = (paymentId: number) => {
    setPaymentToDelete(paymentId);
    setDeleteConfirmText("");
    setIsDeletePaymentDialogOpen(true);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    try {
      await deletePayment.mutateAsync(paymentToDelete.toString());
      
      setIsDeletePaymentDialogOpen(false);
      setPaymentToDelete(null);
      setDeleteConfirmText("");
      refetchPayments();
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success("Payment deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payment");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 space-y-4 pb-4">
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
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
          title=""
          description=""
          createHref="/loans/create"
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

      {/* Payment Management Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Payments</DialogTitle>
            <DialogDescription>
              Add payments for this loan. Total due: {selectedEntry ? formatCurrency(selectedEntry.amount) : '0'} | 
              Already paid: {formatCurrency(totalPaid)} | 
              Remaining: {formatCurrency(remainingToPay)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Existing Payments List */}
            {payments.length > 0 && (
              <div className="space-y-2">
                <Label>Existing Payments</Label>
                <div className="border rounded-md divide-y">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                          <span className="text-sm text-muted-foreground">
                            on {formatDate(payment.paymentDate)}
                          </span>
                          {payment.paymentMethod && (
                            <span className="text-sm text-muted-foreground">
                              ({payment.paymentMethod.replace('_', ' ')})
                            </span>
                          )}
                          {payment.notes && (
                            <span className="text-sm text-muted-foreground">- {payment.notes}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePaymentClick(payment.id)}
                        disabled={deletePayment.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add New Payment Form */}
            {remainingToPay > 0 && (
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">Add New Payment</Label>
                <div className="space-y-2">
                  <Label htmlFor="paidDate">Payment Date</Label>
                  <DatePicker
                    id="paidDate"
                    value={newPaymentDate}
                    onChange={(d) => setNewPaymentDate(d ?? new Date())}
                    placeholder="Pick a date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={remainingToPay}
                    defaultValue={remainingToPay.toString()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum: {formatCurrency(remainingToPay)}
                  </p>
                </div>
                <UnifiedSelector
                  label="Payment Method"
                  type="method"
                  id="paymentMethod"
                  items={[
                    { id: 'cash', name: 'Cash' },
                    { id: 'card', name: 'Card' },
                    { id: 'bank_transfer', name: 'Bank Transfer' },
                  ]}
                  selectedId={paymentMethod || undefined}
                  onSelect={(item) => setPaymentMethod(item.id === 0 ? 'bank_transfer' : String(item.id))}
                  placeholder="Select payment method"
                />
                <div className="space-y-2">
                  <Label htmlFor="paymentNotes">Notes (optional)</Label>
                  <Input
                    id="paymentNotes"
                    type="text"
                    placeholder="Payment reference, check number, etc."
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Close
            </Button>
            {remainingToPay > 0 && (
              <Button
                onClick={() => {
                  const amountInput = document.getElementById('paymentAmount') as HTMLInputElement;
                  const notesInput = document.getElementById('paymentNotes') as HTMLInputElement;
                  const amount = parseFloat(amountInput?.value || '0');
                  
                  if (amount <= 0) {
                    toast.error("Payment amount must be greater than 0");
                    return;
                  }
                  
                  if (amount > remainingToPay) {
                    toast.error(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingToPay)}`);
                    return;
                  }
                  
                  handleAddPayment(
                    dateToYYYYMMDD(newPaymentDate),
                    amount,
                    notesInput?.value || undefined
                  );
                }}
                disabled={createPayment.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Payment Confirmation Dialog */}
      <AlertDialog open={isDeletePaymentDialogOpen} onOpenChange={setIsDeletePaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
              <br />
              <br />
              Type <strong>DELETE</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeletePaymentDialogOpen(false);
              setPaymentToDelete(null);
              setDeleteConfirmText("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmText !== "DELETE"}
            >
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

