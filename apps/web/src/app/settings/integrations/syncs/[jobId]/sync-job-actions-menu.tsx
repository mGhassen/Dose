'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Button } from '@kit/ui/button';
import { Loader2, MoreVertical, RotateCcw, Wrench } from 'lucide-react';
import { useRecoverSyncJob, useToast } from '@kit/hooks';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import type { SyncJobRecoveryAction, SyncJobRecoveryState } from '@kit/types';
import {
  buildRecoveryOptions,
  getRecoveryConfirmCopy,
  type RecoveryActionOption,
} from '../sync-job-recovery-options';

type Props = {
  jobId: number;
  recovery?: SyncJobRecoveryState | null;
  showRetry: boolean;
  showBackfill: boolean;
  onRetry: () => void | Promise<void>;
  onBackfill: () => void | Promise<void>;
  retryPending?: boolean;
  backfillPending?: boolean;
};

export function SyncJobActionsMenu({
  jobId,
  recovery,
  showRetry,
  showBackfill,
  onRetry,
  onBackfill,
  retryPending,
  backfillPending,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const recoverSyncJob = useRecoverSyncJob();
  const recoveryOptions = recovery ? buildRecoveryOptions(jobId, recovery) : [];
  const hasMenu = showRetry || showBackfill || recoveryOptions.length > 0;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<RecoveryActionOption | null>(null);

  if (!hasMenu) return null;

  const runRecovery = async (action: SyncJobRecoveryAction) => {
    try {
      const result = await recoverSyncJob.mutateAsync({ jobId, action });
      const target =
        result.successor_job_id != null
          ? `/settings/integrations/syncs/${result.successor_job_id}`
          : result.redirect;
      if (target) router.push(target);
      toast({
        title:
          result.successor_job_id != null
            ? `Opened job #${result.successor_job_id}`
            : 'Job updated',
        description: result.message,
      });
    } catch (e: unknown) {
      toast({
        title: 'Action failed',
        description: e instanceof Error ? e.message : 'Could not update job',
        variant: 'destructive',
      });
    }
  };

  const handleRecoveryClick = (opt: RecoveryActionOption) => {
    if (opt.destructive) {
      setPendingRecovery(opt);
      setConfirmOpen(true);
      return;
    }
    void runRecovery(opt.value);
  };

  const confirmCopy =
    pendingRecovery && recovery
      ? getRecoveryConfirmCopy(jobId, pendingRecovery.value, recovery)
      : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Job actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {showRetry && (
            <DropdownMenuItem
              disabled={retryPending}
              onClick={() => void onRetry()}
              className="cursor-pointer"
            >
              {retryPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Retry
            </DropdownMenuItem>
          )}
          {showBackfill && (
            <DropdownMenuItem
              disabled={backfillPending}
              onClick={() => void onBackfill()}
              className="cursor-pointer flex-col items-start"
            >
              <span className="flex items-center">
                {backfillPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4 mr-2" />
                )}
                Backfill stock
              </span>
              <span className="text-xs text-muted-foreground pl-6 mt-0.5">
                Reconcile sale lines and stock for this job
              </span>
            </DropdownMenuItem>
          )}
          {recoveryOptions.length > 0 && (showRetry || showBackfill) && <DropdownMenuSeparator />}
          {recoveryOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              disabled={recoverSyncJob.isPending}
              onClick={() => handleRecoveryClick(opt)}
              className={`cursor-pointer flex-col items-start ${opt.destructive ? 'text-destructive focus:text-destructive' : ''}`}
            >
              <span>{opt.label}</span>
              <span className="text-xs text-muted-foreground font-normal line-clamp-2">
                {opt.description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirmCopy && pendingRecovery && (
        <ConfirmationDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) setPendingRecovery(null);
          }}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmText={confirmCopy.confirmText}
          variant={pendingRecovery.destructive ? 'destructive' : 'default'}
          isPending={recoverSyncJob.isPending}
          onConfirm={() => {
            setConfirmOpen(false);
            const action = pendingRecovery.value;
            setPendingRecovery(null);
            void runRecovery(action);
          }}
        />
      )}
    </>
  );
}
