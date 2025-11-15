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
import { Edit2, Check, X, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useUpdateLoanScheduleEntry, useActualPayments, useCreateActualPayment, useDeleteActualPayment } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { LoanScheduleEntry } from "@kit/types";

interface EditableScheduleRowProps {
  entry: LoanScheduleEntry;
  loanId: string;
  onUpdate: () => void;
}

export function EditableScheduleRow({ entry, loanId, onUpdate }: EditableScheduleRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [editData, setEditData] = useState({
    paymentDate: entry.paymentDate.split('T')[0],
    principalPayment: entry.principalPayment.toString(),
    interestPayment: entry.interestPayment.toString(),
    totalPayment: entry.totalPayment.toString(),
    remainingBalance: entry.remainingBalance.toString(),
  });
  const updateMutation = useUpdateLoanScheduleEntry();
  const { data: actualPayments } = useActualPayments({
    paymentType: 'loan',
    referenceId: loanId,
    scheduleEntryId: String(entry.id),
  });
  
  const totalPaid = actualPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const isFullyPaid = totalPaid >= entry.totalPayment;
  const remainingToPay = Math.max(0, entry.totalPayment - totalPaid);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        loanId,
        scheduleId: String(entry.id),
        data: {
          paymentDate: editData.paymentDate,
          principalPayment: parseFloat(editData.principalPayment),
          interestPayment: parseFloat(editData.interestPayment),
          totalPayment: parseFloat(editData.totalPayment),
          remainingBalance: parseFloat(editData.remainingBalance),
        },
      });
      setIsEditing(false);
      onUpdate();
      toast.success("Schedule entry updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update schedule entry");
    }
  };

  const createPayment = useCreateActualPayment();
  const deletePayment = useDeleteActualPayment();

  const handleAddPayment = async (paidDate: string, amount: number, notes?: string) => {
    try {
      await createPayment.mutateAsync({
        paymentType: 'loan',
        direction: 'output', // Loan payments are output (money going out)
        referenceId: Number(loanId),
        scheduleEntryId: entry.id,
        month: entry.paymentDate.slice(0, 7),
        paymentDate: paidDate,
        amount: amount,
        isPaid: true,
        paidDate: paidDate,
        notes: notes,
      });
      
      // Update schedule entry if fully paid
      const newTotalPaid = totalPaid + amount;
      if (newTotalPaid >= entry.totalPayment && !entry.isPaid) {
        await updateMutation.mutateAsync({
          loanId,
          scheduleId: String(entry.id),
          data: {
            isPaid: true,
            paidDate: paidDate,
          },
        });
      }
      
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
      
      // Recalculate if still fully paid
      const remainingPayments = actualPayments?.filter(p => p.id !== paymentId) || [];
      const newTotalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
      if (newTotalPaid < entry.totalPayment && entry.isPaid) {
        await updateMutation.mutateAsync({
          loanId,
          scheduleId: String(entry.id),
          data: {
            isPaid: false,
            paidDate: null,
          },
        });
      }
      
      onUpdate();
      toast.success("Payment deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payment");
    }
  };

  if (isEditing) {
    return (
      <TableRow className="bg-muted/50">
        <TableCell className="font-medium">{entry.month}</TableCell>
        <TableCell>
          <Input
            type="date"
            value={editData.paymentDate}
            onChange={(e) => setEditData(prev => ({ ...prev, paymentDate: e.target.value }))}
            className="w-40"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            value={editData.principalPayment}
            onChange={(e) => setEditData(prev => ({ ...prev, principalPayment: e.target.value }))}
            className="w-32 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            value={editData.interestPayment}
            onChange={(e) => setEditData(prev => ({ ...prev, interestPayment: e.target.value }))}
            className="w-32 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            value={editData.totalPayment}
            onChange={(e) => setEditData(prev => ({ ...prev, totalPayment: e.target.value }))}
            className="w-32 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            value={editData.remainingBalance}
            onChange={(e) => setEditData(prev => ({ ...prev, remainingBalance: e.target.value }))}
            className="w-32 text-right"
          />
        </TableCell>
        <TableCell>
          <Badge variant={entry.isPaid ? "default" : "secondary"}>
            {entry.isPaid ? 'Paid' : 'Pending'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setEditData({
                  paymentDate: entry.paymentDate.split('T')[0],
                  principalPayment: entry.principalPayment.toString(),
                  interestPayment: entry.interestPayment.toString(),
                  totalPayment: entry.totalPayment.toString(),
                  remainingBalance: entry.remainingBalance.toString(),
                });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  const isPastDue = new Date(entry.paymentDate) < new Date() && !isFullyPaid;
  const isProjected = new Date(entry.paymentDate) > new Date();

  return (
    <>
      <TableRow className={isPastDue ? "bg-destructive/10" : isProjected ? "bg-muted/50" : ""}>
        <TableCell className="font-medium">{entry.month}</TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            {formatDate(entry.paymentDate)}
            {isProjected && (
              <span className="text-xs text-muted-foreground">(Projected)</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">{formatCurrency(entry.principalPayment)}</TableCell>
        <TableCell className="text-right">{formatCurrency(entry.interestPayment)}</TableCell>
        <TableCell className="text-right font-semibold">
          <div className="flex flex-col items-end">
            {formatCurrency(entry.totalPayment)}
            {totalPaid > 0 && (
              <span className="text-xs text-muted-foreground">
                Paid: {formatCurrency(totalPaid)}
                {remainingToPay > 0 && ` (${formatCurrency(remainingToPay)} remaining)`}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">{formatCurrency(entry.remainingBalance)}</TableCell>
        <TableCell>
          <Badge variant={isFullyPaid ? "default" : isPastDue ? "destructive" : "secondary"}>
            {isFullyPaid ? 'Paid' : totalPaid > 0 ? `Partial (${formatCurrency(totalPaid)})` : isPastDue ? 'Past Due' : 'Pending'}
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
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Entry
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsPaidDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </DropdownMenuItem>
              {actualPayments && actualPayments.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowPayments(!showPayments)}>
                    {showPayments ? 'Hide' : 'Show'} Payments ({actualPayments.length})
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      
      {/* Show partial payments */}
      {showPayments && actualPayments && actualPayments.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 p-4">
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
              Record a partial or full payment for this schedule entry.
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
                defaultValue={remainingToPay > 0 ? remainingToPay.toString() : entry.totalPayment.toString()}
                max={remainingToPay > 0 ? remainingToPay : entry.totalPayment}
              />
              <p className="text-xs text-muted-foreground">
                Total due: {formatCurrency(entry.totalPayment)} | 
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

