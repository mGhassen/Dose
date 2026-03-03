"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { TableRow, TableCell } from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import { Checkbox } from "@kit/ui/checkbox";
import { useUpdatePersonnelSalaryProjectionEntry, useCreateOrUpdatePersonnelSalaryProjectionEntry, usePersonnelSalaryProjections } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { dateToYYYYMMDD } from "@kit/lib";
import { formatDate, formatMonthYear } from "@kit/lib/date-format";
import { DatePicker } from "@kit/ui/date-picker";
import type { PersonnelSalaryProjection } from "@kit/types";

interface EditablePersonnelTimelineRowProps {
  projection: PersonnelSalaryProjection;
  personnelId: number;
  onUpdate: () => void;
  employeeSocialTaxRate?: number;
  socialSecurityRate?: number;
}

export function EditablePersonnelTimelineRow({
  projection,
  personnelId,
  onUpdate,
  employeeSocialTaxRate,
  socialSecurityRate,
}: EditablePersonnelTimelineRowProps) {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [netPaidDate, setNetPaidDate] = useState(projection.netPaidDate || projection.netPaymentDate || "");
  const [taxesPaidDate, setTaxesPaidDate] = useState(projection.taxesPaidDate || projection.taxesPaymentDate || "");
  const [actualNetAmount, setActualNetAmount] = useState(
    projection.actualNetAmount?.toString() || projection.netSalary.toString()
  );
  const [actualTaxesAmount, setActualTaxesAmount] = useState(
    projection.actualTaxesAmount?.toString() || (projection.socialTaxes + projection.employerTaxes).toString()
  );
  const [notes, setNotes] = useState(projection.notes || "");
  const [isNetPaidChecked, setIsNetPaidChecked] = useState(false);
  const [isTaxesPaidChecked, setIsTaxesPaidChecked] = useState(false);

  const { data: storedProjections } = usePersonnelSalaryProjections(personnelId.toString());
  const projectionEntry: any = storedProjections?.find((p: any) => p.month === projection.month);

  const handleOpenDialog = () => {
    if (projectionEntry) {
      setNetPaidDate(projectionEntry.netPaidDate || projection.netPaymentDate || "");
      setTaxesPaidDate(projectionEntry.taxesPaidDate || projection.taxesPaymentDate || "");
      setActualNetAmount(projectionEntry.actualNetAmount?.toString() ?? projection.netSalary.toString());
      setActualTaxesAmount(
        projectionEntry.actualTaxesAmount?.toString() ?? (projection.socialTaxes + projection.employerTaxes).toString()
      );
      setNotes(projectionEntry.notes || "");
      setIsNetPaidChecked(!!projectionEntry.isNetPaid);
      setIsTaxesPaidChecked(!!projectionEntry.isTaxesPaid);
    } else {
      setNetPaidDate(projection.netPaymentDate || "");
      setTaxesPaidDate(projection.taxesPaymentDate || "");
      setActualNetAmount(projection.netSalary.toString());
      setActualTaxesAmount((projection.socialTaxes + projection.employerTaxes).toString());
      setNotes("");
      setIsNetPaidChecked(false);
      setIsTaxesPaidChecked(false);
    }
    setIsPaymentDialogOpen(true);
  };

  const updateProjectionEntry = useUpdatePersonnelSalaryProjectionEntry();
  const createOrUpdateProjectionEntry = useCreateOrUpdatePersonnelSalaryProjectionEntry();
  const totalTaxes = projection.socialTaxes + projection.employerTaxes;

  const savePayments = async () => {
    try {
      const netDate = netPaidDate || projection.netPaymentDate || new Date().toISOString().split("T")[0];
      const taxesDate = taxesPaidDate || projection.taxesPaymentDate || new Date().toISOString().split("T")[0];
      const netAmount = parseFloat(actualNetAmount) || projection.netSalary;
      const taxesAmount = parseFloat(actualTaxesAmount) || totalTaxes;

      const payload = {
        bruteSalary: projection.bruteSalary,
        netSalary: projection.netSalary,
        socialTaxes: projection.socialTaxes,
        employerTaxes: projection.employerTaxes,
        netPaymentDate: projection.netPaymentDate,
        taxesPaymentDate: projection.taxesPaymentDate,
        isProjected: projection.isProjected,
        isNetPaid: isNetPaidChecked,
        isTaxesPaid: isTaxesPaidChecked,
        netPaidDate: isNetPaidChecked ? netDate : null,
        taxesPaidDate: isTaxesPaidChecked ? taxesDate : null,
        actualNetAmount: netAmount,
        actualTaxesAmount: taxesAmount,
        notes: notes || undefined,
      };

      if (projectionEntry?.id) {
        await updateProjectionEntry.mutateAsync({
          personnelId: personnelId.toString(),
          entryId: projectionEntry.id.toString(),
          data: payload,
        });
      } else {
        await createOrUpdateProjectionEntry.mutateAsync({
          personnelId: personnelId.toString(),
          data: { month: projection.month, ...payload },
        });
      }

      toast.success("Payments saved");
      setIsPaymentDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save payments");
    }
  };

  const isNetPaid = projectionEntry?.isNetPaid || false;
  const isTaxesPaid = projectionEntry?.isTaxesPaid || false;
  const isFullyPaid = isNetPaid && isTaxesPaid;

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{formatMonthYear(projection.month)}</TableCell>
        <TableCell>
          <div className="space-y-0.5">
            <div className="text-sm text-muted-foreground">Brute: {formatCurrency(projection.bruteSalary)}</div>
            <div className="font-semibold">Net: {formatCurrency(projection.netSalary)}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-0.5">
            <div className="text-sm">
              Social: {formatCurrency(projection.socialTaxes)}
              {socialSecurityRate !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">({Math.round(socialSecurityRate * 100)}%)</span>
              )}
            </div>
            <div className="text-sm">
              Employer: {formatCurrency(projection.employerTaxes)}
              {employeeSocialTaxRate !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">({Math.round(employeeSocialTaxRate * 100)}%)</span>
              )}
            </div>
            <div className="font-semibold">Total: {formatCurrency(totalTaxes)}</div>
          </div>
        </TableCell>
        <TableCell>
          {isFullyPaid ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600">Paid</Badge>
          ) : (
            <Badge variant="secondary">Pending</Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenDialog} className="h-8">
              {isFullyPaid ? "Edit payment" : "Record payment"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Net: {formatDate(projection.netPaymentDate || "")} · Taxes: {formatDate(projection.taxesPaymentDate || "")}
            </span>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {formatMonthYear(projection.month)} — Net salary and taxes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3 rounded-lg border p-3">
              <Label className="text-sm font-semibold">Net salary</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="netPaidDate" className="text-xs">Date</Label>
                  <DatePicker
                    id="netPaidDate"
                    value={netPaidDate ? new Date(netPaidDate) : undefined}
                    onChange={(d) => setNetPaidDate(d ? dateToYYYYMMDD(d) : "")}
                    placeholder="Date"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="actualNetAmount" className="text-xs">Amount</Label>
                  <Input
                    id="actualNetAmount"
                    type="number"
                    step="0.01"
                    value={actualNetAmount}
                    onChange={(e) => setActualNetAmount(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Projected: {formatCurrency(projection.netSalary)}</p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isNetPaid"
                  checked={isNetPaidChecked}
                  onCheckedChange={(c) => setIsNetPaidChecked(c === true)}
                />
                <Label htmlFor="isNetPaid" className="cursor-pointer text-sm">Mark net as paid</Label>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <Label className="text-sm font-semibold">Taxes</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="taxesPaidDate" className="text-xs">Date</Label>
                  <DatePicker
                    id="taxesPaidDate"
                    value={taxesPaidDate ? new Date(taxesPaidDate) : undefined}
                    onChange={(d) => setTaxesPaidDate(d ? dateToYYYYMMDD(d) : "")}
                    placeholder="Date"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="actualTaxesAmount" className="text-xs">Amount</Label>
                  <Input
                    id="actualTaxesAmount"
                    type="number"
                    step="0.01"
                    value={actualTaxesAmount}
                    onChange={(e) => setActualTaxesAmount(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Projected: {formatCurrency(totalTaxes)}</p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isTaxesPaid"
                  checked={isTaxesPaidChecked}
                  onCheckedChange={(c) => setIsTaxesPaidChecked(c === true)}
                />
                <Label htmlFor="isTaxesPaid" className="cursor-pointer text-sm">Mark taxes as paid</Label>
              </div>
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
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={savePayments}
              disabled={updateProjectionEntry.isPending || createOrUpdateProjectionEntry.isPending}
            >
              {updateProjectionEntry.isPending || createOrUpdateProjectionEntry.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
