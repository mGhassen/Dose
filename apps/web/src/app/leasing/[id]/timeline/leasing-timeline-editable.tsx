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
import { Plus, Trash2, MoreVertical, Edit2, Check, X } from "lucide-react";
import { Checkbox } from "@kit/ui/checkbox";
import { useCreateActualPayment, useDeleteActualPayment, useActualPayments } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";
import type { LeasingTimelineEntry } from "@/lib/calculations/leasing-timeline";

interface EditableLeasingTimelineRowProps {
  entry: LeasingTimelineEntry;
  leasingId: number;
  onUpdate: () => void;
}

export function EditableLeasingTimelineRow({ entry, leasingId, onUpdate }: EditableLeasingTimelineRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [editData, setEditData] = useState({
    paymentDate: entry.paymentDate.split('T')[0],
    amount: entry.amount.toString(),
    isFixedAmount: entry.isFixedAmount || false,
    shouldProject: false,
  });
  
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
        direction: 'output', // Leasing payments are output (money going out)
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

  const handleSave = async () => {
    try {
      let entryId = entry.id;
      const newAmount = parseFloat(editData.amount);
      const isFixedAmount = editData.isFixedAmount;
      const shouldProject = editData.shouldProject;

      if (newAmount <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }

      // If entry doesn't have an ID, we need to ensure it exists in the database first
      if (!entryId) {
        // Generate timeline to create the entry
        const generateResponse = await fetch(
          `/api/leasing/${leasingId}/generate-timeline?startMonth=${entry.month}&endMonth=${entry.month}`,
          { method: 'POST' }
        );
        if (!generateResponse.ok) {
          throw new Error('Failed to create timeline entry');
        }

        // Fetch the created entry to get its ID
        const timelineResponse = await fetch(
          `/api/leasing/${leasingId}/timeline?startMonth=${entry.month}&endMonth=${entry.month}`
        );
        if (!timelineResponse.ok) {
          throw new Error('Failed to fetch timeline entry');
        }
        const timelineEntries: any[] = await timelineResponse.json();
        const createdEntry = timelineEntries.find(
          (e: any) => e.month === entry.month && e.paymentDate.split('T')[0] === entry.paymentDate.split('T')[0]
        );
        if (!createdEntry) {
          throw new Error('Created entry not found');
        }
        entryId = createdEntry.id;
      }

      // Update the entry
      const response = await fetch(`/api/leasing/${leasingId}/timeline/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: editData.paymentDate,
          amount: newAmount,
          isFixedAmount: isFixedAmount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update entry');
      }

      // If should project and not fixed, regenerate timeline for future entries
      if (shouldProject && !isFixedAmount) {
        const startMonth = entry.month;
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        const endMonth = endDate.toISOString().slice(0, 7);

        // Call generate timeline to regenerate future entries
        await fetch(`/api/leasing/${leasingId}/generate-timeline?startMonth=${startMonth}&endMonth=${endMonth}`, {
          method: 'POST',
        });
      }

      setIsEditing(false);
      onUpdate();
      toast.success("Entry updated" + (shouldProject && !isFixedAmount ? " and timeline projected" : ""));
    } catch (error: any) {
      toast.error(error?.message || "Failed to update entry");
    }
  };

  const [year, month] = entry.month.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const paymentDate = new Date(entry.paymentDate);
  const isProjected = entry.isProjected;
  const isPastDue = paymentDate < new Date() && !isFullyPaid;

  if (isEditing) {
    return (
      <TableRow className="bg-muted/50">
        <TableCell className="font-medium">
          {formatMonthYear(date)}
        </TableCell>
        <TableCell>
          <Input
            type="date"
            value={editData.paymentDate}
            onChange={(e) => setEditData(prev => ({ ...prev, paymentDate: e.target.value }))}
            className="w-40"
          />
        </TableCell>
        <TableCell>
          <div className="space-y-2">
            <Input
              type="number"
              step="0.01"
              value={editData.amount}
              onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
              className="w-32 text-right"
              min="0"
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editIsFixedAmount"
                checked={editData.isFixedAmount}
                onCheckedChange={(checked) => {
                  setEditData(prev => ({ 
                    ...prev, 
                    isFixedAmount: checked as boolean,
                    shouldProject: checked ? false : prev.shouldProject
                  }));
                }}
              />
              <Label htmlFor="editIsFixedAmount" className="text-xs cursor-pointer">
                Fixed
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editShouldProject"
                checked={editData.shouldProject}
                onCheckedChange={(checked) => {
                  setEditData(prev => ({ 
                    ...prev, 
                    shouldProject: checked as boolean,
                    isFixedAmount: checked ? false : prev.isFixedAmount
                  }));
                }}
                disabled={editData.isFixedAmount}
              />
              <Label htmlFor="editShouldProject" className="text-xs cursor-pointer">
                Project
              </Label>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge 
            variant={isFullyPaid ? "default" : isPastDue ? "destructive" : totalPaid > 0 ? "outline" : isProjected ? "secondary" : "outline"}
            className={totalPaid > 0 && !isFullyPaid ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700" : ""}
          >
            {isFullyPaid ? "Paid" : totalPaid > 0 ? "Partially Paid" : isProjected ? "Projected" : "Pending"}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {actualPayments && actualPayments.length > 0 && actualPayments[0].notes && actualPayments[0].notes}
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
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
                  amount: entry.amount.toString(),
                  isFixedAmount: entry.isFixedAmount || false,
                  shouldProject: false,
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

  return (
    <>
      <TableRow className={isPastDue ? "bg-destructive/10" : isProjected && !isFullyPaid ? "bg-muted/50" : ""}>
        <TableCell className="font-medium">
          {formatMonthYear(date)}
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            {formatDate(entry.paymentDate)}
          </div>
        </TableCell>
        <TableCell className="font-semibold">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {formatCurrency(entry.amount)}
              {entry.isFixedAmount && (
                <Badge variant="outline" className="text-xs">
                  Fixed
                </Badge>
              )}
            </div>
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
            variant={isFullyPaid ? "default" : isPastDue ? "destructive" : totalPaid > 0 ? "outline" : isProjected ? "secondary" : "outline"}
            className={totalPaid > 0 && !isFullyPaid ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700" : ""}
          >
            {isFullyPaid ? "Paid" : totalPaid > 0 ? "Partially Paid" : isProjected ? "Projected" : "Pending"}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {actualPayments && actualPayments.length > 0 && actualPayments[0].notes && actualPayments[0].notes}
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
              <DropdownMenuSeparator />
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

