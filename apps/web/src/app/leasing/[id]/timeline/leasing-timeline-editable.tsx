"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { TableRow, TableCell } from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { useCreateActualPayment, useDeleteActualPayment, useActualPayments } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { LeasingTimelineEntry } from "@/lib/calculations/leasing-timeline";

interface EditableLeasingTimelineRowProps {
  entry: LeasingTimelineEntry;
  leasingId: number;
  onUpdate: () => void;
}

export function EditableLeasingTimelineRow({ entry, leasingId, onUpdate }: EditableLeasingTimelineRowProps) {
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  
  const { data: actualPayments } = useActualPayments({
    paymentType: 'leasing',
    referenceId: String(leasingId),
    month: entry.month,
  });
  
  const totalPaid = actualPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const isFullyPaid = totalPaid >= entry.amount;
  const remainingToPay = Math.max(0, entry.amount - totalPaid);
  
  const createPayment = useCreateActualPayment();
  const deletePayment = useDeleteActualPayment();

  const handleAddPayment = async (paidDate: string, amount: number, notes?: string) => {
    try {
      await createPayment.mutateAsync({
        paymentType: 'leasing',
        referenceId: leasingId,
        month: entry.month,
        paymentDate: paidDate,
        amount: amount,
        isPaid: true,
        paidDate: paidDate,
        notes: notes,
      });
      
      setIsPaidDialogOpen(false);
      onUpdate();
      toast.success("Payment recorded");
    } catch (error: any) {
      toast.error(error?.message || "Failed to record payment");
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      await deletePayment.mutateAsync(String(paymentId));
      onUpdate();
      toast.success("Payment deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payment");
    }
  };

  const [year, month] = entry.month.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const paymentDate = new Date(entry.paymentDate);
  const isProjected = entry.isProjected;
  const isPastDue = paymentDate < new Date() && !isFullyPaid;

  return (
    <>
      <TableRow className={isPastDue ? "bg-destructive/10" : isProjected && !isFullyPaid ? "bg-muted/50" : ""}>
        <TableCell className="font-medium">
          <div className="flex items-center space-x-2">
            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            {isProjected && !isFullyPaid && (
              <Badge variant="secondary" className="text-xs">(Projected)</Badge>
            )}
            {totalPaid > 0 && (
              <Badge variant="default" className="text-xs">(Actual)</Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            {formatDate(entry.paymentDate)}
          </div>
        </TableCell>
        <TableCell className="font-semibold">
          <div className="flex flex-col">
            {formatCurrency(entry.amount)}
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
            {isFullyPaid ? "Paid" : totalPaid > 0 ? `Partial (${formatCurrency(totalPaid)})` : isProjected ? "Projected" : "Pending"}
          </Badge>
          {actualPayments && actualPayments.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-2"
              onClick={() => setShowPayments(!showPayments)}
            >
              {showPayments ? 'Hide' : `${actualPayments.length} payment(s)`}
            </Button>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {actualPayments && actualPayments.length > 0 && actualPayments[0].notes && actualPayments[0].notes}
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPaidDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      
      {/* Show partial payments */}
      {showPayments && actualPayments && actualPayments.length > 0 && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-4">
            <div className="space-y-2 py-2">
              <div className="text-sm font-medium">Partial Payments:</div>
              {actualPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span>{formatDate(payment.paymentDate)}</span>
                    <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                    {payment.notes && (
                      <span className="text-muted-foreground">- {payment.notes}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePayment(payment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
      
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a partial or full payment for this leasing entry.
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
                defaultValue={remainingToPay > 0 ? remainingToPay.toString() : entry.amount.toString()}
                max={remainingToPay > 0 ? remainingToPay : entry.amount}
              />
              <p className="text-xs text-muted-foreground">
                Total due: {formatCurrency(entry.amount)} | 
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
                handleAddPayment(
                  dateInput?.value || new Date().toISOString().split('T')[0],
                  parseFloat(amountInput?.value || '0'),
                  notesInput?.value || undefined
                );
              }}
              disabled={createPayment.isPending}
            >
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

