"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useLoans, useLoanSchedule, useEntries, usePaymentsByEntry, useCreatePayment } from "@kit/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { Loan, LoanScheduleEntry } from "@kit/lib";

export default function CreateLoanPaymentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'select-loan' | 'select-schedule' | 'make-payment'>('select-loan');
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [selectedScheduleEntry, setSelectedScheduleEntry] = useState<LoanScheduleEntry | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  
  const { data: loans } = useLoans();
  const { data: schedule } = useLoanSchedule(selectedLoanId);
  const { data: entriesData } = useEntries({
    direction: 'output',
    entryType: 'loan_payment',
    referenceId: selectedLoanId ? parseInt(selectedLoanId) : undefined,
    includePayments: true,
  });
  
  const scheduleEntryEntry = entriesData?.data?.find(
    e => e.scheduleEntryId === selectedScheduleEntry?.id
  );
  
  const { data: payments = [] } = usePaymentsByEntry(
    scheduleEntryEntry?.id?.toString() || ''
  );
  const createPayment = useCreatePayment();
  
  const totalPaid = scheduleEntryEntry && payments ? (payments.reduce((sum, p) => sum + p.amount, 0)) : 0;
  const remainingToPay = selectedScheduleEntry ? Math.max(0, selectedScheduleEntry.totalPayment - totalPaid) : 0;

  useEffect(() => {
    if (selectedScheduleEntry && step === 'make-payment') {
      setPaymentAmount(remainingToPay.toString());
      // Refetch entries to get the latest entry for this schedule
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    }
  }, [selectedScheduleEntry, step, remainingToPay, queryClient]);

  // Refetch entries when moving to payment step
  useEffect(() => {
    if (step === 'make-payment' && selectedLoanId) {
      queryClient.invalidateQueries({ 
        queryKey: ['entries'],
        exact: false 
      });
    }
  }, [step, selectedLoanId, queryClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLoanId || !selectedScheduleEntry) {
      toast.error("Please select a loan and schedule entry");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    if (amount > remainingToPay) {
      toast.error(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingToPay)}`);
      return;
    }

    // If entry doesn't exist, we need to create it first
    let entryId = scheduleEntryEntry?.id;
    
    if (!entryId) {
      // Create the entry first
      try {
        const entryResponse = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            direction: 'output',
            entryType: 'loan_payment',
            name: `${selectedLoan?.name} - Payment Month ${selectedScheduleEntry.month}`,
            amount: selectedScheduleEntry.totalPayment,
            description: `Principal: ${selectedScheduleEntry.principalPayment}, Interest: ${selectedScheduleEntry.interestPayment}`,
            entryDate: selectedScheduleEntry.paymentDate,
            dueDate: selectedScheduleEntry.paymentDate,
            referenceId: parseInt(selectedLoanId),
            scheduleEntryId: selectedScheduleEntry.id,
            isActive: true,
          }),
        });
        
        if (!entryResponse.ok) {
          throw new Error('Failed to create entry');
        }
        
        const entryData = await entryResponse.json();
        entryId = entryData.id;
      } catch (error: any) {
        toast.error(error?.message || "Failed to create entry for payment");
        return;
      }
    }

    try {
      await createPayment.mutateAsync({
        entryId: entryId,
        paymentDate: paymentDate,
        amount: amount,
        isPaid: true,
        paidDate: paymentDate,
        paymentMethod: paymentMethod || undefined,
        notes: paymentNotes || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['loans', selectedLoanId, 'schedule'] });
      toast.success("Payment recorded successfully");
      router.push('/loans/output');
    } catch (error: any) {
      toast.error(error?.message || "Failed to record payment");
    }
  };

  const selectedLoan = loans?.find((l: Loan) => l.id.toString() === selectedLoanId);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            {step === 'select-loan' && 'Select Loan'}
            {step === 'select-schedule' && 'Select Schedule Entry'}
            {step === 'make-payment' && 'Record Payment'}
          </h1>
          <p className="text-muted-foreground">
            {step === 'select-loan' && 'Choose a loan to make a payment for'}
            {step === 'select-schedule' && 'Select a schedule entry to pay'}
            {step === 'make-payment' && 'Record payment for the selected schedule entry'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Select Loan */}
          {step === 'select-loan' && (
            <Card>
              <CardHeader>
                <CardTitle>Select Loan</CardTitle>
                <CardDescription>Choose a loan to make a payment for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                {selectedLoanId && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setStep('select-schedule')}
                      disabled={!selectedLoanId}
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Schedule Entry */}
          {step === 'select-schedule' && schedule && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Select Schedule Entry</CardTitle>
                    <CardDescription>
                      {selectedLoan?.name} - {schedule.length} schedule entries
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep('select-loan');
                      setSelectedScheduleEntry(null);
                    }}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                      {schedule
                        .filter((entry: LoanScheduleEntry) => {
                          // Filter out fully paid entries
                          const entryPayments = entriesData?.data?.find(
                            e => e.scheduleEntryId === entry.id
                          );
                          const payments = entryPayments?.payments || [];
                          const totalPaid = payments.filter((p: any) => p.isPaid).reduce((sum: number, p: any) => sum + p.amount, 0);
                          const isFullyPaid = totalPaid >= entry.totalPayment;
                          return !isFullyPaid; // Only show entries that are not fully paid
                        })
                        .map((entry: LoanScheduleEntry) => {
                          const entryPayments = entriesData?.data?.find(
                            e => e.scheduleEntryId === entry.id
                          );
                          const payments = entryPayments?.payments || [];
                          const totalPaid = payments.filter((p: any) => p.isPaid).reduce((sum: number, p: any) => sum + p.amount, 0);
                          const isFullyPaid = totalPaid >= entry.totalPayment;
                          const hasPartial = totalPaid > 0 && !isFullyPaid;
                          const isPastDue = new Date(entry.paymentDate) < new Date() && !isFullyPaid;
                          
                          return (
                            <TableRow key={entry.id} className={isPastDue ? "bg-destructive/10" : "cursor-pointer hover:bg-muted/50"}>
                              <TableCell className="font-medium">{entry.month}</TableCell>
                              <TableCell>{formatDate(entry.paymentDate)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(entry.principalPayment)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(entry.interestPayment)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(entry.totalPayment)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(entry.remainingBalance)}</TableCell>
                              <TableCell>
                                <Badge variant={isFullyPaid ? "default" : isPastDue ? "destructive" : hasPartial ? "outline" : "secondary"}>
                                  {isFullyPaid ? 'Paid' : hasPartial ? `Partial (${formatCurrency(totalPaid)})` : isPastDue ? 'Past Due' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedScheduleEntry(entry);
                                    setStep('make-payment');
                                  }}
                                  disabled={isFullyPaid}
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
              </CardContent>
            </Card>
          )}

          {/* Step 3: Make Payment */}
          {step === 'make-payment' && selectedScheduleEntry && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Record Payment</CardTitle>
                    <CardDescription>
                      Payment for {selectedLoan?.name} - Month {selectedScheduleEntry.month}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
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
              </CardHeader>
              <CardContent className="space-y-6">
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
                {remainingToPay > 0 ? (
                  <div className="space-y-4 border-t pt-4">
                    <Label className="text-base font-semibold">Payment Details</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payment-date">Payment Date *</Label>
                        <Input
                          id="payment-date"
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment-amount">Payment Amount *</Label>
                        <Input
                          id="payment-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={remainingToPay}
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          required
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
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="Payment reference, check number, etc."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Badge variant="default" className="mb-2">Fully Paid</Badge>
                    <p className="text-sm text-muted-foreground">This schedule entry is fully paid.</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/loans/output')}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  {remainingToPay > 0 && (
                    <Button type="submit" disabled={createPayment.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {createPayment.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </AppLayout>
  );
}

