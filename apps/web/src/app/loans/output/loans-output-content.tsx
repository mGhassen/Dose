"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useEntries, useDeleteEntry, useLoans, useLoanSchedule, usePaymentsByEntry, useCreatePayment } from "@kit/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { Entry, Loan, LoanScheduleEntry } from "@kit/lib";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kit/ui/table";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function LoansOutputContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [selectedScheduleEntry, setSelectedScheduleEntry] = useState<LoanScheduleEntry | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [step, setStep] = useState<'select-loan' | 'select-schedule' | 'make-payment'>('select-loan');
  
  const { data: entriesData, isLoading } = useEntries({ 
    direction: 'output', 
    entryType: 'loan_payment',
    includePayments: true,
    page,
    limit: pageSize
  });
  const deleteMutation = useDeleteEntry();
  
  // Fetch loans for selection
  const { data: loans } = useLoans();
  
  // Fetch schedule for selected loan
  const { data: schedule } = useLoanSchedule(selectedLoanId);
  
  // Find the entry for the selected schedule entry
  const scheduleEntryEntry = entriesData?.data?.find(
    e => e.scheduleEntryId === selectedScheduleEntry?.id
  );
  
  // Fetch payments for selected schedule entry's entry
  const { data: payments = [], refetch: refetchPayments } = usePaymentsByEntry(
    scheduleEntryEntry?.id?.toString() || ''
  );
  const createPayment = useCreatePayment();
  
  const totalPaid = scheduleEntryEntry ? (payments.reduce((sum, p) => sum + p.amount, 0)) : 0;
  const remainingToPay = selectedScheduleEntry ? Math.max(0, selectedScheduleEntry.totalPayment - totalPaid) : 0;

  // Refetch entries when schedule entry is selected to get the latest entry
  useEffect(() => {
    if (selectedScheduleEntry && step === 'make-payment') {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    }
  }, [selectedScheduleEntry, step, queryClient]);

  const entries = entriesData?.data || [];
  const totalCount = entriesData?.pagination?.total || 0;

  const columns: ColumnDef<Entry>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Payment Description",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Payment Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => row.original.dueDate ? formatDate(row.original.dueDate) : formatDate(row.original.entryDate),
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
          const dueDate = row.original.dueDate ? new Date(row.original.dueDate) : new Date(row.original.entryDate);
          const isPastDue = dueDate < new Date();
          return <Badge variant={isPastDue ? "destructive" : "secondary"}>
            {isPastDue ? "Past Due" : "Pending Payment"}
          </Badge>;
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
      toast.success("Loan payment entry deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete loan payment entry");
    }
  };

  const handleBulkDelete = async (entries: Entry[]) => {
    try {
      await Promise.all(entries.map(entry => deleteMutation.mutateAsync(entry.id.toString())));
      toast.success(`${entries.length} loan payment entry(ies) deleted successfully`);
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
      ['Payment Description', 'Payment Amount', 'Due Date', 'Description'].join(','),
      ...entries.map(entry => [
        `"${entry.name}"`,
        entry.amount,
        entry.dueDate || entry.entryDate,
        `"${entry.description || ''}"`
      ].join(','))
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
          headerActions={
            <Button
              className="bg-primary hover:bg-green-700 text-white"
              onClick={() => {
                setIsPaymentDialogOpen(true);
                setStep('select-loan');
                setSelectedLoanId("");
                setSelectedScheduleEntry(null);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Insert
            </Button>
          }
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
          filterColumns={[]}
          sortColumns={[
            { value: "name", label: "Payment Description", type: "character varying" },
            { value: "amount", label: "Payment Amount", type: "numeric" },
            { value: "dueDate", label: "Due Date", type: "date" },
          ]}
          localStoragePrefix="loans-output"
          searchFields={["name", "description"]}
        />
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === 'select-loan' && 'Select Loan'}
              {step === 'select-schedule' && 'Select Schedule Entry'}
              {step === 'make-payment' && 'Make Payment'}
            </DialogTitle>
            <DialogDescription>
              {step === 'select-loan' && 'Choose a loan to make a payment for'}
              {step === 'select-schedule' && 'Select a schedule entry to pay'}
              {step === 'make-payment' && `Make a payment for the selected schedule entry`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Step 1: Select Loan */}
            {step === 'select-loan' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loan-select">Select Loan</Label>
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
                {selectedLoanId && (
                  <div className="flex justify-end">
                    <Button onClick={() => setStep('select-schedule')} disabled={!selectedLoanId}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Select Schedule Entry */}
            {step === 'select-schedule' && schedule && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('select-loan');
                      setSelectedScheduleEntry(null);
                    }}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {schedule.length} schedule entries
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Remaining Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((entry: LoanScheduleEntry) => {
                        const entryPayments = entriesData?.data?.find(
                          e => e.scheduleEntryId === entry.id
                        );
                        const entryTotalPaid = entryPayments?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
                        const isFullyPaid = entryTotalPaid >= entry.totalPayment;
                        const hasPartial = entryTotalPaid > 0 && !isFullyPaid;
                        
                        return (
                          <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium">{entry.month}</TableCell>
                            <TableCell>{formatDate(entry.paymentDate)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.principalPayment)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.interestPayment)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(entry.totalPayment)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.remainingBalance)}</TableCell>
                            <TableCell>
                              <Badge variant={isFullyPaid ? "default" : hasPartial ? "outline" : "secondary"}>
                                {isFullyPaid ? 'Paid' : hasPartial ? `Partial (${formatCurrency(entryTotalPaid)})` : 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedScheduleEntry(entry);
                                  setStep('make-payment');
                                  // Fetch payments for this entry
                                  const entryId = entryPayments?.id;
                                  if (entryId) {
                                    // The usePaymentsByEntry hook will be called with the entry ID
                                  }
                                }}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Step 3: Make Payment */}
            {step === 'make-payment' && selectedScheduleEntry && scheduleEntryEntry && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('select-schedule');
                      setSelectedScheduleEntry(null);
                    }}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>

                {/* Schedule Entry Info */}
                <div className="border rounded-md p-4 bg-muted/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Month</Label>
                      <p className="font-semibold">{selectedScheduleEntry.month}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Date</Label>
                      <p className="font-semibold">{formatDate(selectedScheduleEntry.paymentDate)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Due</Label>
                      <p className="font-semibold">{formatCurrency(selectedScheduleEntry.totalPayment)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Remaining</Label>
                      <p className="font-semibold text-orange-600">{formatCurrency(remainingToPay)}</p>
                    </div>
                  </div>
                </div>

                {/* Existing Payments */}
                {payments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Existing Payments</Label>
                    <div className="border rounded-md divide-y">
                      {payments.map((payment: any) => (
                        <div key={payment.id} className="p-3 flex items-center justify-between">
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Form */}
                {remainingToPay > 0 && (
                  <div className="space-y-4 border-t pt-4">
                    <Label className="text-base font-semibold">Add Payment</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payment-date">Payment Date</Label>
                        <Input
                          id="payment-date"
                          type="date"
                          defaultValue={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-amount">Payment Amount</Label>
                        <Input
                          id="payment-amount"
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
                      <div className="space-y-2">
                        <Label htmlFor="payment-method">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger id="payment-method">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-notes">Notes (optional)</Label>
                        <Input
                          id="payment-notes"
                          type="text"
                          placeholder="Payment reference, check number, etc."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {remainingToPay === 0 && (
                  <div className="text-center py-4">
                    <Badge variant="default" className="mb-2">Fully Paid</Badge>
                    <p className="text-sm text-muted-foreground">This schedule entry is fully paid.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setStep('select-loan');
                setSelectedLoanId("");
                setSelectedScheduleEntry(null);
              }}
            >
              Cancel
            </Button>
            {step === 'make-payment' && remainingToPay > 0 && (
              <Button
                onClick={() => {
                  const dateInput = document.getElementById('payment-date') as HTMLInputElement;
                  const amountInput = document.getElementById('payment-amount') as HTMLInputElement;
                  const notesInput = document.getElementById('payment-notes') as HTMLInputElement;
                  const amount = parseFloat(amountInput?.value || '0');
                  
                  if (amount <= 0) {
                    toast.error("Payment amount must be greater than 0");
                    return;
                  }
                  
                  if (amount > remainingToPay) {
                    toast.error(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingToPay)}`);
                    return;
                  }
                  
                  if (!scheduleEntryEntry?.id) {
                    toast.error("Entry not found for this schedule");
                    return;
                  }
                  
                  createPayment.mutateAsync({
                    entryId: scheduleEntryEntry.id,
                    paymentDate: dateInput?.value || new Date().toISOString().split('T')[0],
                    amount: amount,
                    isPaid: true,
                    paidDate: dateInput?.value || new Date().toISOString().split('T')[0],
                    paymentMethod: paymentMethod || undefined,
                    notes: notesInput?.value || undefined,
                  }).then(() => {
                    refetchPayments();
                    queryClient.invalidateQueries({ queryKey: ['entries'] });
                    queryClient.invalidateQueries({ queryKey: ['loans', selectedLoanId, 'schedule'] });
                    toast.success("Payment recorded successfully");
                    setIsPaymentDialogOpen(false);
                    setStep('select-loan');
                    setSelectedLoanId("");
                    setSelectedScheduleEntry(null);
                  }).catch((error: any) => {
                    toast.error(error?.message || "Failed to record payment");
                  });
                }}
                disabled={createPayment.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {createPayment.isPending ? "Processing..." : "Record Payment"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

