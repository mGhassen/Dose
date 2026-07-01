export const STOPPED_FOR_RECOVERY_MESSAGE = 'Stopped by user for recovery';

export function formatRecoveryActionLabel(action?: string | null): string | null {
  if (!action) return null;
  switch (action) {
    case 'resume_fetch':
      return 'Resume fetch';
    case 'process_staged':
      return 'Process staged';
    case 'discard_staging':
      return 'Discard staging';
    default:
      return action.replace(/_/g, ' ');
  }
}

export function isBenignStopMessage(status: string, errorMessage?: string | null): boolean {
  return status === 'stopped' && Boolean(errorMessage?.includes(STOPPED_FOR_RECOVERY_MESSAGE));
}
