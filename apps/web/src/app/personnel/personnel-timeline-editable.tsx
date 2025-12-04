"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { TableRow, TableCell } from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { Checkbox } from "@kit/ui/checkbox";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";
import { useUpdatePersonnelSalaryProjectionEntry, useCreateOrUpdatePersonnelSalaryProjectionEntry, usePersonnelSalaryProjections } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";
import type { PersonnelSalaryProjection } from "@kit/types";

interface EditablePersonnelTimelineRowProps {
  projection: PersonnelSalaryProjection;
  personnelId: number;
  onUpdate: () => void;
  employeeSocialTaxRate?: number; // As decimal (e.g., 0.20 for 20%)
  socialSecurityRate?: number; // As decimal (e.g., 0.1875 for 18.75%)
}

export function EditablePersonnelTimelineRow({ 
  projection, 
  personnelId, 
  onUpdate,
  employeeSocialTaxRate,
  socialSecurityRate
}: EditablePersonnelTimelineRowProps) {
  const [isNetPaidDialogOpen, setIsNetPaidDialogOpen] = useState(false);
  const [isTaxesPaidDialogOpen, setIsTaxesPaidDialogOpen] = useState(false);
  const [netPaidDate, setNetPaidDate] = useState(projection.netPaidDate || projection.netPaymentDate || '');
  const [taxesPaidDate, setTaxesPaidDate] = useState(projection.taxesPaidDate || projection.taxesPaymentDate || '');
  const [actualNetAmount, setActualNetAmount] = useState(projection.actualNetAmount?.toString() || projection.netSalary.toString());
  const [actualTaxesAmount, setActualTaxesAmount] = useState(projection.actualTaxesAmount?.toString() || (projection.socialTaxes + projection.employerTaxes).toString());
  const [notes, setNotes] = useState(projection.notes || '');
  const [isNetPaidChecked, setIsNetPaidChecked] = useState(false);
  const [isTaxesPaidChecked, setIsTaxesPaidChecked] = useState(false);
  
  // Fetch stored projection entries to get the entry ID and payment status
  const { data: storedProjections } = usePersonnelSalaryProjections(personnelId.toString());
  const projectionEntry: any = storedProjections?.find((p: any) => p.month === projection.month);
  
  // Initialize checkbox states when dialog opens
  const handleOpenNetDialog = () => {
    setIsNetPaidChecked(projectionEntry?.isNetPaid || false);
    setIsNetPaidDialogOpen(true);
  };
  
  const handleOpenTaxesDialog = () => {
    setIsTaxesPaidChecked(projectionEntry?.isTaxesPaid || false);
    setIsTaxesPaidDialogOpen(true);
  };
  
  const updateProjectionEntry = useUpdatePersonnelSalaryProjectionEntry();
  const createOrUpdateProjectionEntry = useCreateOrUpdatePersonnelSalaryProjectionEntry();

  const handleMarkNetAsPaid = async () => {
    try {
      const paidDate = netPaidDate || projection.netPaymentDate || new Date().toISOString().split('T')[0];
      const amount = parseFloat(actualNetAmount) || projection.netSalary;

      if (projectionEntry?.id) {
        // Update existing entry
        await updateProjectionEntry.mutateAsync({
          personnelId: personnelId.toString(),
          entryId: projectionEntry.id.toString(),
          data: {
            isNetPaid: isNetPaidChecked,
            netPaidDate: isNetPaidChecked ? paidDate : null,
            actualNetAmount: amount,
            notes: notes || undefined,
          },
        });
      } else {
        // Create new entry
        await createOrUpdateProjectionEntry.mutateAsync({
          personnelId: personnelId.toString(),
          data: {
            month: projection.month,
            bruteSalary: projection.bruteSalary,
            netSalary: projection.netSalary,
            socialTaxes: projection.socialTaxes,
            employerTaxes: projection.employerTaxes,
            netPaymentDate: projection.netPaymentDate,
            taxesPaymentDate: projection.taxesPaymentDate,
            isProjected: projection.isProjected,
            isNetPaid: isNetPaidChecked,
            isTaxesPaid: projectionEntry?.isTaxesPaid || false,
            netPaidDate: isNetPaidChecked ? paidDate : null,
            taxesPaidDate: projectionEntry?.taxesPaidDate,
            actualNetAmount: amount,
            actualTaxesAmount: projectionEntry?.actualTaxesAmount,
            notes: notes || undefined,
          },
        });
      }
      
      toast.success(isNetPaidChecked ? "Net salary marked as paid" : "Net salary payment recorded");
      setIsNetPaidDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save net salary payment");
    }
  };

  const handleMarkTaxesAsPaid = async () => {
    try {
      const paidDate = taxesPaidDate || projection.taxesPaymentDate || new Date().toISOString().split('T')[0];
      const amount = parseFloat(actualTaxesAmount) || (projection.socialTaxes + projection.employerTaxes);

      if (projectionEntry?.id) {
        // Update existing entry
        await updateProjectionEntry.mutateAsync({
          personnelId: personnelId.toString(),
          entryId: projectionEntry.id.toString(),
          data: {
            isTaxesPaid: isTaxesPaidChecked,
            taxesPaidDate: isTaxesPaidChecked ? paidDate : null,
            actualTaxesAmount: amount,
            notes: notes || undefined,
          },
        });
      } else {
        // Create new entry
        await createOrUpdateProjectionEntry.mutateAsync({
          personnelId: personnelId.toString(),
          data: {
            month: projection.month,
            bruteSalary: projection.bruteSalary,
            netSalary: projection.netSalary,
            socialTaxes: projection.socialTaxes,
            employerTaxes: projection.employerTaxes,
            netPaymentDate: projection.netPaymentDate,
            taxesPaymentDate: projection.taxesPaymentDate,
            isProjected: projection.isProjected,
            isNetPaid: projectionEntry?.isNetPaid || false,
            isTaxesPaid: isTaxesPaidChecked,
            netPaidDate: projectionEntry?.netPaidDate,
            taxesPaidDate: isTaxesPaidChecked ? paidDate : null,
            actualNetAmount: projectionEntry?.actualNetAmount,
            actualTaxesAmount: amount,
            notes: notes || undefined,
          },
        });
      }
      
      toast.success(isTaxesPaidChecked ? "Taxes marked as paid" : "Taxes payment recorded");
      setIsTaxesPaidDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save taxes payment");
    }
  };

  const handleUnmarkNetAsPaid = async () => {
    if (!projectionEntry?.id) return;
    
    try {
      await updateProjectionEntry.mutateAsync({
        personnelId: personnelId.toString(),
        entryId: projectionEntry.id.toString(),
        data: {
          isNetPaid: false,
          netPaidDate: null,
          actualNetAmount: null,
        },
      });
      
      toast.success("Net salary unmarked as paid");
      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to unmark net salary as paid");
    }
  };

  const handleUnmarkTaxesAsPaid = async () => {
    if (!projectionEntry?.id) return;
    
    try {
      await updateProjectionEntry.mutateAsync({
        personnelId: personnelId.toString(),
        entryId: projectionEntry.id.toString(),
        data: {
          isTaxesPaid: false,
          taxesPaidDate: null,
          actualTaxesAmount: null,
        },
      });
      
      toast.success("Taxes unmarked as paid");
      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to unmark taxes as paid");
    }
  };

  const isNetPaid = projectionEntry?.isNetPaid || false;
  const isTaxesPaid = projectionEntry?.isTaxesPaid || false;
  const totalTaxes = projection.socialTaxes + projection.employerTaxes;

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{formatMonthYear(projection.month)}</TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Brute: {formatCurrency(projection.bruteSalary)}</div>
            <div className="font-semibold">Net: {formatCurrency(projection.netSalary)}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="text-sm">
              Social: {formatCurrency(projection.socialTaxes)}
              {employeeSocialTaxRate !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(employeeSocialTaxRate * 100)}%)
                </span>
              )}
            </div>
            <div className="text-sm">
              Employer: {formatCurrency(projection.employerTaxes)}
              {socialSecurityRate !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round(socialSecurityRate * 100)}%)
                </span>
              )}
            </div>
            <div className="font-semibold">Total: {formatCurrency(totalTaxes)}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isNetPaid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Net Paid</span>
                  {projectionEntry?.netPaidDate && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(projectionEntry.netPaidDate)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnmarkNetAsPaid}
                    className="h-6 px-2 text-xs"
                  >
                    Unmark
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenNetDialog}
                  className="h-7"
                >
                  Record Net Payment
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isTaxesPaid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Taxes Paid</span>
                  {projectionEntry?.taxesPaidDate && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(projectionEntry.taxesPaidDate)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnmarkTaxesAsPaid}
                    className="h-6 px-2 text-xs"
                  >
                    Unmark
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenTaxesDialog}
                  className="h-7"
                >
                  Record Taxes Payment
                </Button>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Net: {formatDate(projection.netPaymentDate || '')}</div>
            <div>Taxes: {formatDate(projection.taxesPaymentDate || '')}</div>
          </div>
        </TableCell>
      </TableRow>

      {/* Net Payment Dialog */}
      <Dialog open={isNetPaidDialogOpen} onOpenChange={setIsNetPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Net Salary Payment</DialogTitle>
            <DialogDescription>
              Record the payment for net salary for {formatMonthYear(projection.month)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="netPaidDate">Payment Date *</Label>
              <Input
                id="netPaidDate"
                type="date"
                value={netPaidDate}
                onChange={(e) => setNetPaidDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualNetAmount">Actual Amount *</Label>
              <Input
                id="actualNetAmount"
                type="number"
                step="0.01"
                value={actualNetAmount}
                onChange={(e) => setActualNetAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Projected: {formatCurrency(projection.netSalary)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isNetPaid"
                checked={isNetPaidChecked}
                onCheckedChange={(checked) => setIsNetPaidChecked(checked === true)}
              />
              <Label htmlFor="isNetPaid" className="cursor-pointer">
                Payment has been processed (debited from bank account)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNetPaidDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkNetAsPaid} disabled={updateProjectionEntry.isPending || createOrUpdateProjectionEntry.isPending}>
              {updateProjectionEntry.isPending || createOrUpdateProjectionEntry.isPending ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Taxes Payment Dialog */}
      <Dialog open={isTaxesPaidDialogOpen} onOpenChange={setIsTaxesPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Taxes Payment</DialogTitle>
            <DialogDescription>
              Record the payment for taxes for {formatMonthYear(projection.month)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="taxesPaidDate">Payment Date *</Label>
              <Input
                id="taxesPaidDate"
                type="date"
                value={taxesPaidDate}
                onChange={(e) => setTaxesPaidDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualTaxesAmount">Actual Amount *</Label>
              <Input
                id="actualTaxesAmount"
                type="number"
                step="0.01"
                value={actualTaxesAmount}
                onChange={(e) => setActualTaxesAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Projected: {formatCurrency(totalTaxes)} (Social: {formatCurrency(projection.socialTaxes)} + Employer: {formatCurrency(projection.employerTaxes)})
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isTaxesPaid"
                checked={isTaxesPaidChecked}
                onCheckedChange={(checked) => setIsTaxesPaidChecked(checked === true)}
              />
              <Label htmlFor="isTaxesPaid" className="cursor-pointer">
                Payment has been processed (debited from bank account)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notesTaxes">Notes</Label>
              <Input
                id="notesTaxes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaxesPaidDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkTaxesAsPaid} disabled={updateProjectionEntry.isPending || createOrUpdateProjectionEntry.isPending}>
              {updateProjectionEntry.isPending || createOrUpdateProjectionEntry.isPending ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

