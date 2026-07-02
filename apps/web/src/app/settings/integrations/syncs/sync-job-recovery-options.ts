import type { SyncJobRecoveryAction, SyncJobRecoveryState } from '@kit/types';

export type RecoveryActionOption = {
  value: SyncJobRecoveryAction;
  label: string;
  description: string;
  destructive?: boolean;
};

export function buildRecoveryOptions(
  jobId: number,
  recovery: SyncJobRecoveryState
): RecoveryActionOption[] {
  const opts: RecoveryActionOption[] = [];
  const isTerminal = recovery.recovery_phase === 'terminal';
  const hasProcessed = recovery.staging.processed_rows > 0;
  const unprocessed = recovery.staging.unprocessed_rows;

  if (recovery.recovery_phase === 'review') {
    opts.push({
      value: 'resume',
      label: 'Continue review',
      description: `Stop job #${jobId} and open the review page to finish editing.`,
    });
  } else if (recovery.available_actions.includes('resume')) {
    opts.push({
      value: 'resume',
      label: 'Continue from where it stopped',
      description:
        recovery.recovery_phase === 'fetch' || !recovery.fetch_complete
          ? `Resume fetch from the last checkpoint. Staging stays on job #${jobId}.`
          : `Start a new job to resume processing staged data from #${jobId}.`,
    });
  }

  if (recovery.available_actions.includes('process_staged')) {
    opts.push({
      value: 'process_staged',
      label: 'Process staged data now',
      description: `Import staged data from job #${jobId} into the app (fetch is complete).`,
    });
  }

  if (recovery.available_actions.includes('discard_staging')) {
    const discardDesc =
      hasProcessed && unprocessed > 0
        ? `Remove ${unprocessed.toLocaleString()} unprocessed staging rows. ${recovery.staging.processed_rows.toLocaleString()} already-imported rows and their staging copies are kept.`
        : unprocessed > 0
          ? `Remove all ${unprocessed.toLocaleString()} staging rows from job #${jobId}. Nothing was imported yet.`
          : `Remove remaining staging rows from job #${jobId}.`;
    const subjobNote = 'Creates a recovery subjob to perform the deletion.';
    opts.push({
      value: 'discard_staging',
      label: 'Discard unprocessed staging',
      description: isTerminal
        ? `${discardDesc} ${subjobNote}`
        : `Stop job #${jobId} and ${discardDesc.charAt(0).toLowerCase()}${discardDesc.slice(1)} ${subjobNote}`,
      destructive: true,
    });
  }

  if (recovery.available_actions.includes('cancel')) {
    opts.push({
      value: 'cancel',
      label: 'Cancel this job only',
      description: `Mark job #${jobId} as cancelled. Staging is kept — use "Discard unprocessed staging" later to remove it (creates a recovery subjob).`,
      destructive: true,
    });
  }

  return opts;
}

export function getRecoveryConfirmCopy(
  jobId: number,
  action: SyncJobRecoveryAction,
  recovery: SyncJobRecoveryState
): { title: string; description: string; confirmText: string } {
  if (action === 'cancel') {
    return {
      title: 'Cancel job?',
      description: `Job #${jobId} will be marked cancelled. Staging data is kept — no recovery subjob is created. To remove staging later, choose "Discard unprocessed staging" from the actions menu.`,
      confirmText: 'Cancel job',
    };
  }
  if (action === 'discard_staging') {
    const rowsDesc =
      recovery.staging.processed_rows > 0
        ? `Deletes ${recovery.staging.unprocessed_rows.toLocaleString()} unprocessed staging rows. ${recovery.staging.processed_rows.toLocaleString()} imported records and their staging rows are NOT removed.`
        : `Deletes all staging rows for job #${jobId}. Nothing was imported into the app yet.`;
    return {
      title: 'Discard unprocessed staging?',
      description: `${rowsDesc} A recovery subjob will be created to perform the deletion.`,
      confirmText: 'Discard unprocessed',
    };
  }
  const opt = buildRecoveryOptions(jobId, recovery).find((o) => o.value === action);
  return {
    title: opt?.label ?? 'Confirm action',
    description: opt?.description ?? '',
    confirmText: 'Continue',
  };
}
