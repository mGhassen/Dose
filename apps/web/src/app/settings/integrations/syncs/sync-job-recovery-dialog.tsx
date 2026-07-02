"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import { Button } from "@kit/ui/button";
import { Label } from "@kit/ui/label";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useRecoverSyncJob, useToast } from "@kit/hooks";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import type { SyncJobRecoveryAction, SyncJobRecoveryState } from "@kit/types";
import { buildRecoveryOptions, getRecoveryConfirmCopy } from "./sync-job-recovery-options";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  recovery: SyncJobRecoveryState;
};

export function SyncJobRecoveryDialog({ open, onOpenChange, jobId, recovery }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const recoverSyncJob = useRecoverSyncJob();
  const options = buildRecoveryOptions(jobId, recovery);
  const [selected, setSelected] = useState<SyncJobRecoveryAction>(options[0]?.value ?? "resume");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === selected);

  const runAction = async () => {
    try {
      const result = await recoverSyncJob.mutateAsync({ jobId, action: selected });
      const target =
        result.successor_job_id != null
          ? `/settings/integrations/syncs/${result.successor_job_id}`
          : result.redirect;
      if (target) {
        router.push(target);
      }
      toast({
        title:
          result.successor_job_id != null
            ? `Opened job #${result.successor_job_id}`
            : "Job updated",
        description: result.message,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Action failed",
        description: e?.message || "Could not update job",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = () => {
    if (selectedOption?.destructive) {
      setConfirmOpen(true);
      return;
    }
    void runAction();
  };

  const stagingSummary =
    recovery.staging.processed_rows > 0
      ? `${recovery.staging.staged_rows.toLocaleString()} staged · ${recovery.staging.processed_rows.toLocaleString()} processed · ${recovery.staging.unprocessed_rows.toLocaleString()} remaining`
      : `${recovery.staging.staged_rows.toLocaleString()} staged`;

  const confirmCopy = getRecoveryConfirmCopy(jobId, selected, recovery);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Manage sync job</DialogTitle>
            <DialogDescription>
              {recovery.phase_label}
              {recovery.is_stuck && (
                <span className="block mt-1 text-amber-600 dark:text-amber-500">
                  This job appears stuck — no progress for a while.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {recovery.last_step && (
              <p className="text-muted-foreground">
                Last step: <span className="text-foreground">{recovery.last_step.name}</span> (
                {recovery.last_step.status})
              </p>
            )}
            {recovery.staging.staged_rows > 0 && (
              <p className="text-muted-foreground">{stagingSummary}</p>
            )}
            {recovery.fetch_complete === false && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Fetch is incomplete — process staged data is unavailable until all planned months are fetched.
              </p>
            )}

            <RadioGroup
              value={selected}
              onValueChange={(v) => setSelected(v as SyncJobRecoveryAction)}
              className="gap-3"
            >
              {options.map((opt) => (
                <div key={opt.value} className="flex items-start gap-3 rounded-md border p-3">
                  <RadioGroupItem value={opt.value} id={`recover-${opt.value}`} className="mt-0.5" />
                  <Label htmlFor={`recover-${opt.value}`} className="cursor-pointer space-y-1">
                    <span className="font-medium leading-none">{opt.label}</span>
                    <span className="block text-muted-foreground font-normal text-xs">
                      {opt.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={recoverSyncJob.isPending}>
              Close
            </Button>
            <Button onClick={handleConfirm} disabled={recoverSyncJob.isPending || options.length === 0}>
              {recoverSyncJob.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Working…
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmText={confirmCopy.confirmText}
        variant="destructive"
        isPending={recoverSyncJob.isPending}
        onConfirm={() => {
          setConfirmOpen(false);
          void runAction();
        }}
      />
    </>
  );
}
