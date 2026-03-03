"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kit/ui/alert-dialog";
import { Label } from "@kit/ui/label";
import { dateToYYYYMMDD } from "@kit/lib";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface ValidateProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (validFrom: string, validTo?: string) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isPending?: boolean;
}

export function ValidateProcedureDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Validate",
  cancelText = "Cancel",
  isPending = false,
}: ValidateProcedureDialogProps) {
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!validFrom) {
      setError("Valid from date is required");
      return;
    }
    
    // Check if the date is at least tomorrow
    const selectedDate = new Date(validFrom);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < tomorrow) {
      setError("Valid from date must be at least tomorrow");
      return;
    }
    
    // Validate that validTo is at least the day after validFrom if both are provided
    if (validTo) {
      const toDate = new Date(validTo);
      toDate.setHours(0, 0, 0, 0);
      const dayAfterFrom = new Date(selectedDate);
      dayAfterFrom.setDate(dayAfterFrom.getDate() + 1);
      dayAfterFrom.setHours(0, 0, 0, 0);
      if (toDate < dayAfterFrom) {
        setError("Valid to date must be at least the day after valid from date");
        return;
      }
    }
    
    setError("");
    onConfirm(validFrom, validTo || undefined);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setValidFrom("");
      setValidTo("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="validFrom">
              Valid From <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id="validFrom"
              value={validFrom ? new Date(validFrom) : undefined}
              onChange={(d) => {
                const next = d ? dateToYYYYMMDD(d) : "";
                setValidFrom(next);
                if (d && validTo) {
                  const dayAfter = new Date(d);
                  dayAfter.setDate(dayAfter.getDate() + 1);
                  if (new Date(validTo) < dayAfter) setValidTo("");
                }
                setError("");
              }}
              placeholder="Pick a date"
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="validTo">Valid To (Optional)</Label>
            <DatePicker
              id="validTo"
              value={validTo ? new Date(validTo) : undefined}
              onChange={(d) => {
                setValidTo(d ? dateToYYYYMMDD(d) : "");
                setError("");
              }}
              disabled={!validFrom}
              placeholder="Pick a date"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending || !validFrom}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

