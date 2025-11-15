"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { TableRow, TableCell } from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { Edit2, Check, X } from "lucide-react";
import { useUpdateLoanScheduleEntry } from "@kit/hooks";
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
  const [editData, setEditData] = useState({
    paymentDate: entry.paymentDate.split('T')[0],
    principalPayment: entry.principalPayment.toString(),
    interestPayment: entry.interestPayment.toString(),
    totalPayment: entry.totalPayment.toString(),
    remainingBalance: entry.remainingBalance.toString(),
  });
  const updateMutation = useUpdateLoanScheduleEntry();

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

  const handleMarkAsPaid = async (paidDate?: string) => {
    try {
      await updateMutation.mutateAsync({
        loanId,
        scheduleId: String(entry.id),
        data: {
          isPaid: true,
          paidDate: paidDate || new Date().toISOString().split('T')[0],
        },
      });
      setIsPaidDialogOpen(false);
      onUpdate();
      toast.success("Payment marked as paid");
    } catch (error: any) {
      toast.error(error?.message || "Failed to mark payment as paid");
    }
  };

  const handleUnmarkAsPaid = async () => {
    try {
      await updateMutation.mutateAsync({
        loanId,
        scheduleId: String(entry.id),
        data: {
          isPaid: false,
          paidDate: null,
        },
      });
      onUpdate();
      toast.success("Payment unmarked");
    } catch (error: any) {
      toast.error(error?.message || "Failed to unmark payment");
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

  const isPastDue = new Date(entry.paymentDate) < new Date() && !entry.isPaid;
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
        <TableCell className="text-right font-semibold">{formatCurrency(entry.totalPayment)}</TableCell>
        <TableCell className="text-right">{formatCurrency(entry.remainingBalance)}</TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Badge variant={entry.isPaid ? "default" : isPastDue ? "destructive" : "secondary"}>
              {entry.isPaid ? 'Paid' : isPastDue ? 'Past Due' : 'Pending'}
            </Badge>
            {entry.isPaid && entry.paidDate && (
              <span className="text-xs text-muted-foreground">
                ({formatDate(entry.paidDate)})
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            {!entry.isPaid ? (
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
                disabled={updateMutation.isPending}
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
              Record the actual payment date for this schedule entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paidDate">Paid Date</Label>
              <Input
                id="paidDate"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  // Store in state for later use
                }}
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
                const input = document.getElementById('paidDate') as HTMLInputElement;
                handleMarkAsPaid(input?.value || new Date().toISOString().split('T')[0]);
              }}
              disabled={updateMutation.isPending}
            >
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

