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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { useUpdateLoanScheduleEntry, useCreatePayment, useDeletePayment } from "@kit/hooks";
import type { Entry } from "@kit/lib";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { LoanScheduleEntry } from "@kit/types";

interface EditableScheduleRowProps {
  entry: LoanScheduleEntry;
  loanId: string;
  onUpdate: () => void;
  allEntries?: Entry[];
  offPaymentMonths?: number[];
}

export function EditableScheduleRow({ entry, loanId, onUpdate, allEntries = [], offPaymentMonths = [] }: EditableScheduleRowProps) {
  const isOffPaymentMonth = offPaymentMonths.includes(entry.month);
  const [isEditing, setIsEditing] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [editData, setEditData] = useState({
    paymentDate: entry.paymentDate.split('T')[0],
    principalPayment: entry.principalPayment.toString(),
    interestPayment: entry.interestPayment.toString(),
    totalPayment: entry.totalPayment.toString(),
    remainingBalance: entry.remainingBalance.toString(),
  });
  const updateMutation = useUpdateLoanScheduleEntry();
  
  // Use entries passed from parent (already fetched once for all schedule entries)
  // Find entries for this specific schedule entry
  const allEntriesForSchedule = allEntries.filter(e => e.scheduleEntryId === entry.id);
  const scheduleEntryEntry = allEntriesForSchedule[0];
  
  // Get all payments for this schedule entry (from all entries if duplicates exist)
  const allPayments = allEntriesForSchedule.flatMap(e => e.payments || []);
  const totalPaid = allPayments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
  
  // Use the isPaid status from the schedule API (which calculates it correctly)
  // But also calculate locally for display purposes
  const isFullyPaid = entry.isPaid || totalPaid >= entry.totalPayment;
  const remainingToPay = Math.max(0, entry.totalPayment - totalPaid);
  
  // Get payments for display (only from the first entry to avoid duplicates in UI)
  const payments = scheduleEntryEntry?.payments || [];

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

  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const handleAddPayment = async (paidDate: string, amount: number, paymentMethod?: string, notes?: string) => {
    try {
      // Ensure entry exists - check all entries for this schedule entry
      let entryId = scheduleEntryEntry?.id;
      
      // If no entry found, check if one exists in the database (might be a race condition)
      if (!entryId) {
        const checkResponse = await fetch(`/api/entries?direction=output&entryType=loan_payment&referenceId=${loanId}&scheduleEntryId=${entry.id}&limit=1`);
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.data && checkData.data.length > 0) {
            entryId = checkData.data[0].id;
          }
        }
      }
      
      // Only create if still no entry exists
      if (!entryId) {
        // Create the entry first
        const entryResponse = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            direction: 'output',
            entryType: 'loan_payment',
            name: `Loan Payment - Month ${entry.month}`,
            amount: entry.totalPayment,
            description: `Principal: ${entry.principalPayment}, Interest: ${entry.interestPayment}`,
            entryDate: entry.paymentDate,
            dueDate: entry.paymentDate,
            referenceId: parseInt(loanId),
            scheduleEntryId: entry.id,
            isActive: true,
          }),
        });
        
        if (!entryResponse.ok) {
          throw new Error('Failed to create entry');
        }
        
        const entryData = await entryResponse.json();
        entryId = entryData.id;
      }

      // Create the payment (hooks handle invalidation automatically)
      await createPayment.mutateAsync({
        entryId: entryId!,
        paymentDate: paidDate,
        amount: amount,
        isPaid: true,
        paidDate: paidDate,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
      });
      
      setIsPaidDialogOpen(false);
      onUpdate();
      toast.success("Payment recorded");
    } catch (error: any) {
      // Ignore AbortError - it's expected when queries are cancelled
      if (error instanceof Error && (error.name === 'AbortError' || (error as any).isAbortError)) {
        // Still show success since the payment was created
        setIsPaidDialogOpen(false);
        onUpdate();
        toast.success("Payment recorded");
        return;
      }
      toast.error(error?.message || "Failed to record payment");
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      // Delete payment (hooks handle invalidation automatically)
      await deletePayment.mutateAsync(paymentId.toString());
      
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
          <Badge variant={isFullyPaid ? "default" : "secondary"}>
            {isFullyPaid ? 'Paid' : 'Pending'}
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

  return (
    <>
      <TableRow className={`${isPastDue ? "bg-destructive/10" : ""} ${isOffPaymentMonth ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {entry.month}
            {isOffPaymentMonth && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 text-xs">
                Interest Only
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {formatDate(entry.paymentDate)}
        </TableCell>
        <TableCell className="text-right">
          {isOffPaymentMonth ? (
            <span className="text-muted-foreground italic">—</span>
          ) : (
            formatCurrency(entry.principalPayment)
          )}
        </TableCell>
        <TableCell className="text-right font-medium">{formatCurrency(entry.interestPayment)}</TableCell>
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
              {payments && payments.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowPayments(!showPayments)}>
                    {showPayments ? 'Hide' : 'Show'} Payments ({payments.length})
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      
      {/* Show partial payments */}
      {showPayments && payments && payments.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 p-4">
            <div className="space-y-2 py-2">
              <div className="text-sm font-medium">Payments:</div>
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span>{formatDate(payment.paymentDate)}</span>
                    <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                    {payment.paymentMethod && (
                      <span className="text-muted-foreground">({payment.paymentMethod.replace('_', ' ')})</span>
                    )}
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
                  paymentMethod || undefined,
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

