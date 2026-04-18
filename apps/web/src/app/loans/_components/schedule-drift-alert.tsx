"use client";

import { Alert, AlertDescription, AlertTitle } from "@kit/ui/alert";
import { Button } from "@kit/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useGenerateLoanSchedule } from "@kit/hooks";
import { toast } from "sonner";

interface ScheduleDriftAlertProps {
  loanId: string;
  /** If true, the schedule has paid installments and cannot be regenerated. */
  hasPayments?: boolean;
  className?: string;
}

export function ScheduleDriftAlert({ loanId, hasPayments, className }: ScheduleDriftAlertProps) {
  const generateSchedule = useGenerateLoanSchedule();

  const handleRegenerate = async () => {
    try {
      await generateSchedule.mutateAsync(loanId);
      toast.success("Loan schedule regenerated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to regenerate loan schedule");
    }
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Schedule out of sync with loan</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {hasPayments
              ? "Loan details affecting the schedule have changed, but this loan already has recorded payments. Delete the payments first to regenerate the schedule."
              : "Loan details affecting the schedule have changed. Regenerate the schedule to recalculate all installments."}
          </p>
          {!hasPayments && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerate}
              disabled={generateSchedule.isPending}
              className="shrink-0"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {generateSchedule.isPending ? "Regenerating..." : "Regenerate schedule"}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
