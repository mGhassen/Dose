"use client";

import { useState } from "react";
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
import { Plus, Trash2, MoreVertical, X } from "lucide-react";
import { useUpdateSubscriptionProjectionEntry, useSubscriptionProjections, usePayments } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";
import type { SubscriptionProjection } from "@kit/types";

interface EditableSubscriptionTimelineRowProps {
  projection: SubscriptionProjection;
  subscriptionId: number;
  onUpdate: () => void;
}

export function EditableSubscriptionTimelineRow({ projection, subscriptionId, onUpdate }: EditableSubscriptionTimelineRowProps) {
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  
  // Fetch stored projection entries to get the entry ID and payment status
  const { data: storedProjections } = useSubscriptionProjections(subscriptionId.toString());
  const projectionEntry = storedProjections?.find((p: any) => p.month === projection.month);
  
  // Use the stored projection entry's payment status if available, otherwise use calculated projection
  const isPaid = projectionEntry?.isPaid || false;
  const paidAmount = projectionEntry?.actualAmount || projectionEntry?.amount || 0;
  const totalPaid = isPaid ? paidAmount : 0;
  const isFullyPaid = isPaid && totalPaid >= projection.amount;
  const remainingToPay = Math.max(0, projection.amount - totalPaid);
  
  const updateProjectionEntry = useUpdateSubscriptionProjectionEntry();

  const handleMarkAsPaid = async (paidDate: string, amount: number, notes?: string) => {
    if (!projectionEntry?.id) {
      toast.error("Projection entry not found. Please generate projections first.");
      return;
    }
    
    try {
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
      
      setIsPaidDialogOpen(false);
      onUpdate();
      toast.success("Payment recorded and expense created");
    } catch (error: any) {
      toast.error(error?.message || "Failed to record payment");
    }
  };

  const handleMarkAsUnpaid = async () => {
    if (!projectionEntry?.id) {
      toast.error("Projection entry not found");
      return;
    }
    
    try {
      await updateProjectionEntry.mutateAsync({
        subscriptionId: subscriptionId.toString(),
        entryId: projectionEntry.id.toString(),
        data: {
          isPaid: false,
          paidDate: null,
          actualAmount: null,
        },
      });
      
      onUpdate();
      toast.success("Payment status updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update payment status");
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
          <div className="flex items-center space-x-2">
            {formatMonthYear(date)}
            {isProjected && !isFullyPaid && (
              <Badge variant="secondary" className="text-xs">Declaration</Badge>
            )}
            {totalPaid > 0 && (
              <Badge variant="default" className="text-xs">Paid</Badge>
            )}
          </div>
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
        <Badge variant={isFullyPaid ? "default" : isPastDue ? "destructive" : isProjected ? "secondary" : "outline"}>
          {isFullyPaid ? "Fully Paid" : totalPaid > 0 ? `Partially Paid (${formatCurrency(totalPaid)})` : isProjected ? "Declaration (Unpaid)" : "Pending Payment"}
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
              {!isPaid ? (
                <DropdownMenuItem onClick={() => setIsPaidDialogOpen(true)} disabled={!projectionEntry?.id}>
                  <Plus className="mr-2 h-4 w-4" />
                  Mark as Paid
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleMarkAsUnpaid}>
                  <X className="mr-2 h-4 w-4" />
                  Mark as Unpaid
                </DropdownMenuItem>
              )}
              {projectionEntry?.paidDate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowPayments(!showPayments)}>
                    {showPayments ? 'Hide' : 'Show'} Payment Details
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      
      {/* Show payment details */}
      {showPayments && projectionEntry && isPaid && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30 p-4">
            <div className="space-y-2 py-2">
              <div className="text-sm font-medium">Payment Details:</div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span>Paid Date: {projectionEntry.paidDate ? formatDate(projectionEntry.paidDate) : 'N/A'}</span>
                  <span className="font-semibold">Amount: {formatCurrency(projectionEntry.actualAmount || projectionEntry.amount)}</span>
                  {projectionEntry.notes && (
                    <span className="text-muted-foreground">- {projectionEntry.notes}</span>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
      
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Output Payment</DialogTitle>
            <DialogDescription>
              Record a partial or full output payment (money going out) for this subscription.
              {remainingToPay > 0 && ` Remaining: ${formatCurrency(remainingToPay)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                defaultValue={remainingToPay > 0 ? remainingToPay.toString() : projection.amount.toString()}
                max={remainingToPay > 0 ? remainingToPay : projection.amount}
              />
              <p className="text-xs text-muted-foreground">
                Total due: {formatCurrency(projection.amount)} | 
                Already paid: {formatCurrency(totalPaid)} | 
                Remaining: {formatCurrency(remainingToPay)}
              </p>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaidDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const dateInput = document.getElementById('paidDate') as HTMLInputElement;
                const amountInput = document.getElementById('paymentAmount') as HTMLInputElement;
                const notesInput = document.getElementById('paymentNotes') as HTMLInputElement;
                handleMarkAsPaid(
                  dateInput?.value || new Date().toISOString().split('T')[0],
                  parseFloat(amountInput?.value || '0'),
                  notesInput?.value || undefined
                );
              }}
              disabled={updateProjectionEntry.isPending || !projectionEntry?.id}
            >
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

