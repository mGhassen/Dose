"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { TableRow, TableCell } from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { Edit2, Check, X, Calendar } from "lucide-react";
import { useCreateActualPayment, useUpdateActualPayment, useDeleteActualPayment, useActualPayments } from "@kit/hooks";
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
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualAmount, setActualAmount] = useState(entry.amount.toString());
  
  const { data: actualPayments } = useActualPayments({
    paymentType: 'leasing',
    referenceId: String(leasingId),
    month: entry.month,
  });
  
  const actualPayment = actualPayments?.[0];
  const isActuallyPaid = actualPayment?.isPaid || false;
  const hasActualPayment = !!actualPayment;
  
  const createPayment = useCreateActualPayment();
  const updatePayment = useUpdateActualPayment();
  const deletePayment = useDeleteActualPayment();

  const handleMarkAsPaid = async () => {
    try {
      if (hasActualPayment) {
        await updatePayment.mutateAsync({
          id: String(actualPayment.id),
          data: {
            isPaid: true,
            paidDate: paidDate,
            amount: parseFloat(actualAmount),
          },
        });
      } else {
        await createPayment.mutateAsync({
          paymentType: 'leasing',
          referenceId: leasingId,
          month: entry.month,
          paymentDate: paidDate,
          amount: parseFloat(actualAmount),
          isPaid: true,
          paidDate: paidDate,
        });
      }
      setIsPaidDialogOpen(false);
      onUpdate();
      toast.success("Payment marked as paid");
    } catch (error: any) {
      toast.error(error?.message || "Failed to mark payment as paid");
    }
  };

  const handleUnmarkAsPaid = async () => {
    if (!actualPayment) return;
    
    try {
      await deletePayment.mutateAsync(String(actualPayment.id));
      onUpdate();
      toast.success("Payment unmarked");
    } catch (error: any) {
      toast.error(error?.message || "Failed to unmark payment");
    }
  };

  const [year, month] = entry.month.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const paymentDate = new Date(entry.paymentDate);
  const isProjected = entry.isProjected;
  const isPastDue = paymentDate < new Date() && !isActuallyPaid;

  // Use actual payment data if available, otherwise use projected
  const displayAmount = actualPayment?.amount || entry.amount;
  const displayDate = actualPayment?.paymentDate || entry.paymentDate;
  const displayIsPaid = isActuallyPaid;

  return (
    <>
      <TableRow className={isPastDue ? "bg-destructive/10" : isProjected && !displayIsPaid ? "bg-muted/50" : ""}>
        <TableCell className="font-medium">
          <div className="flex items-center space-x-2">
            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            {isProjected && !displayIsPaid && (
              <Badge variant="secondary" className="text-xs">(Projected)</Badge>
            )}
            {hasActualPayment && (
              <Badge variant="default" className="text-xs">(Actual)</Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            {formatDate(displayDate)}
            {hasActualPayment && displayDate !== entry.paymentDate && (
              <span className="text-xs text-muted-foreground">
                (was {formatDate(entry.paymentDate)})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="font-semibold">
          <div className="flex items-center space-x-2">
            {formatCurrency(displayAmount)}
            {hasActualPayment && displayAmount !== entry.amount && (
              <span className="text-xs text-muted-foreground">
                (was {formatCurrency(entry.amount)})
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={displayIsPaid ? "default" : isProjected ? "secondary" : "outline"}>
            {displayIsPaid ? "Paid" : isProjected ? "Projected" : "Actual"}
          </Badge>
          {displayIsPaid && actualPayment?.paidDate && (
            <span className="text-xs text-muted-foreground ml-2">
              ({formatDate(actualPayment.paidDate)})
            </span>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {hasActualPayment && actualPayment.notes && actualPayment.notes}
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            {!displayIsPaid ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPaidDialogOpen(true)}
              >
                <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUnmarkAsPaid}
                disabled={deletePayment.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription>
              Record the actual payment for this projected payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paidDate">Paid Date</Label>
              <Input
                id="paidDate"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualAmount">Actual Amount</Label>
              <Input
                id="actualAmount"
                type="number"
                step="0.01"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Projected: {formatCurrency(entry.amount)}
              </p>
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
              onClick={handleMarkAsPaid}
              disabled={createPayment.isPending || updatePayment.isPending}
            >
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

