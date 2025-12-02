"use client";

import { useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { TableRow, TableCell } from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Plus, Trash2, MoreVertical, Calendar } from "lucide-react";
import { useUpdateSubscriptionProjectionEntry, useCreateOrUpdateSubscriptionProjectionEntry, useSubscriptionProjections, usePaymentsByEntry, useCreatePayment, useDeletePayment } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";
import type { SubscriptionProjection } from "@kit/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
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

interface EditableSubscriptionTimelineRowProps {
  projection: SubscriptionProjection;
  subscriptionId: number;
  onUpdate: () => void;
}

export function EditableSubscriptionTimelineRow({ projection, subscriptionId, onUpdate }: EditableSubscriptionTimelineRowProps) {
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [isDeletePaymentDialogOpen, setIsDeletePaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showPayments, setShowPayments] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  
  // Fetch stored projection entries to get the entry ID and payment status
  const { data: storedProjections } = useSubscriptionProjections(subscriptionId.toString());
  const projectionEntry: any = storedProjections?.find((p: any) => p.month === projection.month);
  
  // Fetch the entry ID for this projection entry
  useEffect(() => {
    const fetchEntryId = async () => {
      if (projectionEntry?.id) {
        try {
          const response = await fetch(`/api/entries?referenceId=${subscriptionId}&scheduleEntryId=${projectionEntry.id}&entryType=subscription_payment`);
          const data = await response.json();
          if (data?.data && data.data.length > 0) {
            setEntryId(data.data[0].id.toString());
          }
        } catch (error) {
          console.error('Error fetching entry ID:', error);
        }
      }
    };
    fetchEntryId();
  }, [projectionEntry?.id, subscriptionId]);
  
  // Fetch all payments for this entry
  const { data: payments = [], refetch: refetchPayments } = usePaymentsByEntry(entryId || '');
  
  // Calculate total paid from all payments
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.isPaid ? payment.amount : 0), 0);
  const isFullyPaid = totalPaid >= projection.amount;
  const remainingToPay = Math.max(0, projection.amount - totalPaid);
  const hasPartialPayment = totalPaid > 0 && !isFullyPaid;
  
  const updateProjectionEntry = useUpdateSubscriptionProjectionEntry();
  const createOrUpdateProjectionEntry = useCreateOrUpdateSubscriptionProjectionEntry();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const handleMarkAsPaid = async (paidDate: string, amount: number, notes?: string) => {
    try {
      if (projectionEntry?.id) {
        // Update existing entry
        await updateProjectionEntry.mutateAsync({
          subscriptionId: subscriptionId.toString(),
          entryId: projectionEntry.id.toString(),
          data: {
            isPaid: true,
            paidDate: paidDate,
            actualAmount: amount,
            notes: notes,
          },
        });
      } else {
        // Create new entry if it doesn't exist
        await createOrUpdateProjectionEntry.mutateAsync({
          subscriptionId: subscriptionId.toString(),
          data: {
            month: projection.month,
            amount: projection.amount,
            isProjected: projection.isProjected,
            isPaid: true,
            paidDate: paidDate,
            actualAmount: amount,
            notes: notes,
          },
        });
      }
      
      setIsPaidDialogOpen(false);
      onUpdate();
      toast.success("Payment recorded and expense created");
    } catch (error: any) {
      toast.error(error?.message || "Failed to record payment");
    }
  };

  const handleAddPayment = async (paidDate: string, amount: number, paymentMethod?: string, notes?: string) => {
    try {
      // First ensure we have a projection entry and entry
      let currentEntryId = entryId;
      
      if (!projectionEntry?.id) {
        // Create projection entry first
        const projectionResult: any = await createOrUpdateProjectionEntry.mutateAsync({
          subscriptionId: subscriptionId.toString(),
          data: {
            month: projection.month,
            amount: projection.amount,
            isProjected: projection.isProjected,
            isPaid: false, // Will be updated when payment is added
            paidDate: null,
            actualAmount: null,
            notes: null,
          },
        });
        
        // Fetch entry ID after creating projection (with retry in case of timing issues)
        let retries = 3;
        while (!currentEntryId && retries > 0) {
          const response = await fetch(`/api/entries?referenceId=${subscriptionId}&scheduleEntryId=${projectionResult.id}&entryType=subscription_payment`);
          const data = await response.json();
          if (data?.data && data.data.length > 0) {
            currentEntryId = data.data[0].id.toString();
            setEntryId(currentEntryId);
            break;
          }
          retries--;
          if (retries > 0) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } else if (!currentEntryId) {
        // Fetch entry ID if we don't have it
        const response = await fetch(`/api/entries?referenceId=${subscriptionId}&scheduleEntryId=${projectionEntry.id}&entryType=subscription_payment`);
        const data = await response.json();
        if (data?.data && data.data.length > 0) {
          currentEntryId = data.data[0].id.toString();
          setEntryId(currentEntryId);
        }
      }
      
      if (!currentEntryId) {
        toast.error("Entry not found. Please try again.");
        return;
      }
      
      // Create payment
      await createPayment.mutateAsync({
        entryId: parseInt(currentEntryId),
        paymentDate: paidDate,
        amount: amount,
        isPaid: true,
        paidDate: paidDate,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
      });
      
      // Update projection entry to reflect payment status (without creating duplicate payment)
      const newTotalPaid = totalPaid + amount;
      const isNowFullyPaid = newTotalPaid >= projection.amount;
      
      if (projectionEntry?.id) {
        // Update projection entry status
        // Only set isPaid to true when fully paid, never set to false (that would delete all payments)
        const updateData: any = {
          actualAmount: newTotalPaid,
          notes: notes || projectionEntry.notes,
        };
        
        // Only update isPaid if it changes to fully paid
        // Never set isPaid to false when adding a partial payment - that would delete all payments
        const storedEntry: any = storedProjections?.find((p: any) => p.month === projection.month);
        if (isNowFullyPaid && storedEntry && !storedEntry.isPaid) {
          updateData.isPaid = true;
          updateData.paidDate = paidDate;
        }
        
        await updateProjectionEntry.mutateAsync({
          subscriptionId: subscriptionId.toString(),
          entryId: projectionEntry.id.toString(),
          data: updateData,
        });
      }
      
      setIsPaidDialogOpen(false);
      refetchPayments();
      onUpdate();
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
    if (!paymentToDelete) {
      return;
    }

    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    try {
      const payment = payments.find(p => p.id === paymentToDelete);
      if (!payment) {
        toast.error("Payment not found");
        return;
      }
      
      await deletePayment.mutateAsync(paymentToDelete.toString());
      
      // Recalculate total after deletion
      const newTotalPaid = totalPaid - payment.amount;
      const isNowFullyPaid = newTotalPaid >= projection.amount;
      
      // Update projection entry status - only update actualAmount, don't change isPaid
      // Changing isPaid to false would trigger the API to delete all payments
      // We only update actualAmount to reflect the new total
      if (projectionEntry?.id) {
        const updateData: any = {
          actualAmount: newTotalPaid > 0 ? newTotalPaid : null,
        };
        
        // Only update isPaid if it changes to fully paid
        // Never set isPaid to false when deleting a payment - that would delete all payments
        const storedEntry: any = storedProjections?.find((p: any) => p.month === projection.month);
        if (isNowFullyPaid && storedEntry && !storedEntry.isPaid) {
          updateData.isPaid = true;
          const remainingPayments = payments.filter(p => p.id !== paymentToDelete);
          if (remainingPayments.length > 0) {
            updateData.paidDate = remainingPayments[0]?.paidDate;
          }
        }
        
        await updateProjectionEntry.mutateAsync({
          subscriptionId: subscriptionId.toString(),
          entryId: projectionEntry.id.toString(),
          data: updateData,
        });
      }
      
      setIsDeletePaymentDialogOpen(false);
      setPaymentToDelete(null);
      setDeleteConfirmText("");
      refetchPayments();
      onUpdate();
      toast.success("Payment deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payment");
    }
  };


  const [year, month] = projection.month.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const isProjected = projection.isProjected;
  const isPastDue = date < new Date() && !isFullyPaid;

  return (
    <>
      <TableRow className={isPastDue ? "bg-destructive/10" : isProjected && !isFullyPaid ? "bg-muted/50" : ""}>
        <TableCell className="font-medium">
          {formatMonthYear(date)}
        </TableCell>
        <TableCell className="font-semibold">
          <div className="flex flex-col">
            {formatCurrency(projection.amount)}
            {totalPaid > 0 && (
              <span className="text-xs text-muted-foreground">
                Paid: {formatCurrency(totalPaid)}
                {remainingToPay > 0 && ` (${formatCurrency(remainingToPay)} remaining)`}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
        <Badge 
          variant={isFullyPaid ? "default" : isPastDue ? "destructive" : hasPartialPayment ? "outline" : isProjected ? "secondary" : "outline"} 
          className={hasPartialPayment ? "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200" : ""}
        >
          {isFullyPaid ? "Fully Paid" : hasPartialPayment ? "Partially Paid" : isProjected ? "Declaration (Unpaid)" : "Pending Payment"}
        </Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isFullyPaid && (
                <DropdownMenuItem onClick={() => setIsPaidDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {hasPartialPayment ? 'Add Payment' : 'Mark as Paid'}
                </DropdownMenuItem>
              )}
              {payments.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsPaidDialogOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Manage Payments
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      
      {/* Show payment details */}
      {showPayments && payments.length > 0 && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30 p-4">
            <div className="space-y-2 py-2">
              <div className="text-sm font-medium">Payment Details:</div>
              <div className="space-y-1">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span>Date: {formatDate(payment.paymentDate)}</span>
                      <span className="font-semibold">Amount: {formatCurrency(payment.amount)}</span>
                      {payment.notes && (
                        <span className="text-muted-foreground">- {payment.notes}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <span className="text-sm font-semibold">Total Paid: {formatCurrency(totalPaid)} / {formatCurrency(projection.amount)}</span>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
      
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Payments</DialogTitle>
            <DialogDescription>
              Add payments for this subscription. Total due: {formatCurrency(projection.amount)} | 
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
                  <Input
                    id="paidDate"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
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
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="paymentMethod">
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
              onClick={() => setIsPaidDialogOpen(false)}
            >
              Close
            </Button>
            {remainingToPay > 0 && (
              <Button
                onClick={() => {
                  const dateInput = document.getElementById('paidDate') as HTMLInputElement;
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
                    dateInput?.value || new Date().toISOString().split('T')[0],
                    amount,
                    paymentMethod || undefined,
                    notesInput?.value || undefined
                  );
                }}
                disabled={createPayment.isPending || updateProjectionEntry.isPending}
              >
                Add Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeletePaymentDialogOpen} onOpenChange={(open) => {
        setIsDeletePaymentDialogOpen(open);
        if (!open) {
          setPaymentToDelete(null);
          setDeleteConfirmText("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
              <br />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full"
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
              disabled={deleteConfirmText !== "DELETE" || deletePayment.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePayment.isPending ? "Deleting..." : "Delete Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

