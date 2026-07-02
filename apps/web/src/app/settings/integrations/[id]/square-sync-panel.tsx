"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Loader2, Play } from 'lucide-react';
import { useSyncIntegration } from '@kit/hooks';
import type { Integration, SyncJob } from '@kit/types';
import { isSquareSyncBlocked } from './square-sync-status';

type Props = {
  integration: Integration;
  integrationId: string;
  lastJob: SyncJob | null;
};

export function SquareSyncPanel({ integrationId, lastJob }: Props) {
  const router = useRouter();
  const syncIntegration = useSyncIntegration();

  const syncBlocked = isSquareSyncBlocked(lastJob);
  const isPending = syncIntegration.isPending;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Button
        size="lg"
        onClick={() => router.push(`/settings/integrations/${integrationId}/sync`)}
        disabled={syncBlocked || isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        Sync now
      </Button>
      <Button variant="ghost" size="lg" asChild>
        <Link href={`/settings/integrations/syncs?integration_id=${integrationId}`}>
          View sync jobs
        </Link>
      </Button>

      {syncBlocked && (
        <p className="text-sm text-muted-foreground w-full">
          A sync is already running. Wait for it to finish or open the active job.
        </p>
      )}
    </div>
  );
}
