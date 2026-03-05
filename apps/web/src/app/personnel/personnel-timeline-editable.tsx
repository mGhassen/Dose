"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { TableRow, TableCell } from "@kit/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kit/ui/tooltip";
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
        netPaidDate: isNetPaidChecked ? netDate : undefined,
        taxesPaidDate: isTaxesPaidChecked ? taxesDate : undefined,
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
          data: { personnelId: Number(personnelId), month: projection.month, ...payload },
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
  const today = new Date().toISOString().slice(0, 10);
  const netDuePassed = !isNetPaid && (projection.netPaymentDate || "") < today;
  const taxesDuePassed = !isTaxesPaid && (projection.taxesPaymentDate || "") < today;

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{formatMonthYear(projection.month)}</TableCell>
        <TableCell className={`font-semibold tabular-nums ${isNetPaid ? "text-green-600" : netDuePassed ? "text-orange-500" : ""}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted underline-offset-2">{formatCurrency(projection.netSalary)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Brute: {formatCurrency(projection.bruteSalary)}</p>
              <p>Net: {formatCurrency(projection.netSalary)}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className={`tabular-nums ${isTaxesPaid ? "text-green-600" : taxesDuePassed ? "text-orange-500" : ""}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted underline-offset-2">{formatCurrency(totalTaxes)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Social: {formatCurrency(projection.socialTaxes)}</p>
              <p>Employer: {formatCurrency(projection.employerTaxes)}</p>
              <p className="font-semibold mt-0.5">Total: {formatCurrency(totalTaxes)}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell>
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>
            {isFullyPaid ? "Edit" : "Record payment"}
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription className="text-xs">
              {formatMonthYear(projection.month)} — due net {formatDate(projection.netPaymentDate || "")}, taxes {formatDate(projection.taxesPaymentDate || "")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-[72px_1fr_1fr_auto] gap-2 items-center">
              <span className="text-sm font-medium">Net</span>
              <DatePicker
                id="netPaidDate"
                value={netPaidDate ? new Date(netPaidDate) : undefined}
                onChange={(d) => setNetPaidDate(d ? dateToYYYYMMDD(d) : "")}
                placeholder="Date"
              />
              <Input
                id="actualNetAmount"
                type="number"
                step="0.01"
                value={actualNetAmount}
                onChange={(e) => setActualNetAmount(e.target.value)}
                placeholder={formatCurrency(projection.netSalary)}
                className="tabular-nums"
              />
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="isNetPaid"
                  checked={isNetPaidChecked}
                  onCheckedChange={(c) => setIsNetPaidChecked(c === true)}
                />
                <Label htmlFor="isNetPaid" className="cursor-pointer text-xs whitespace-nowrap">Paid</Label>
              </div>
            </div>
            <div className="grid grid-cols-[72px_1fr_1fr_auto] gap-2 items-center">
              <span className="text-sm font-medium">Taxes</span>
              <DatePicker
                id="taxesPaidDate"
                value={taxesPaidDate ? new Date(taxesPaidDate) : undefined}
                onChange={(d) => setTaxesPaidDate(d ? dateToYYYYMMDD(d) : "")}
                placeholder="Date"
              />
              <Input
                id="actualTaxesAmount"
                type="number"
                step="0.01"
                value={actualTaxesAmount}
                onChange={(e) => setActualTaxesAmount(e.target.value)}
                placeholder={formatCurrency(totalTaxes)}
                className="tabular-nums"
              />
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="isTaxesPaid"
                  checked={isTaxesPaidChecked}
                  onCheckedChange={(c) => setIsTaxesPaidChecked(c === true)}
                />
                <Label htmlFor="isTaxesPaid" className="cursor-pointer text-xs whitespace-nowrap">Paid</Label>
              </div>
            </div>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="mt-1"
            />
          </div>
          <DialogFooter className="pt-2">
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
