"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useIntegrationById,
  useSyncJobs,
  useRetrySyncJob,
  useDisconnectIntegration,
} from '@kit/hooks';
import { useToast } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@kit/ui/collapsible';
import {
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { formatDateTime } from '@kit/lib/date-format';
import SquareDataView from '../square-data-view';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { SquareSyncPanel } from './square-sync-panel';
import { SquareSyncStatus } from './square-sync-status';

function getStatusBadge(status: string) {
  switch (status) {
    case 'connected':
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    case 'disconnected':
      return (
        <Badge variant="outline">
          <XCircle className="w-3 h-3 mr-1" />
          Disconnected
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

type Props = {
  id: string;
};

export function SquareIntegrationClient({ id }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { data: integration, isLoading } = useIntegrationById(id);
  const { data: syncJobs = [] } = useSyncJobs(id);
  const retrySyncJob = useRetrySyncJob();
  const disconnectIntegration = useDisconnectIntegration();

  const lastJob = Array.isArray(syncJobs) ? syncJobs[0] : null;

  const handleRetryJob = async (jobId: number) => {
    try {
      await retrySyncJob.mutateAsync(jobId);
      toast({ title: 'Retry started', description: 'Job has been queued for processing.' });
    } catch (e: unknown) {
      toast({
        title: 'Retry failed',
        description: e instanceof Error ? e.message : 'Failed to retry',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectIntegration.mutateAsync(id);
      toast({
        title: 'Disconnected',
        description: 'Integration has been disconnected successfully.',
      });
      setIsDisconnectDialogOpen(false);
      router.push('/settings/integrations');
    } catch (error: unknown) {
      toast({
        title: 'Disconnect failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!integration) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.push('/settings/integrations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Integrations
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Integration not found</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const config = integration.config ?? {};
  const locationId = config.location_id as string | undefined;
  const merchantId = config.merchant_id as string | undefined;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings/integrations')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Square className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{integration.name}</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Square POS ·{' '}
                  {integration.last_sync_at
                    ? `Last synced ${formatDateTime(integration.last_sync_at)}`
                    : 'Not synced yet'}
                </p>
              </div>
            </div>
          </div>
          {getStatusBadge(integration.status)}
        </div>

        <SquareSyncPanel integrationId={id} lastJob={lastJob} />

        <SquareSyncStatus
          integration={integration}
          integrationId={id}
          lastJob={lastJob}
          onRetryJob={handleRetryJob}
          retryPending={retrySyncJob.isPending}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Live Square data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection</CardTitle>
                <CardDescription>Square account linked to Dose</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Connected since</p>
                    <p className="mt-1 text-sm font-medium">{formatDateTime(integration.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sync frequency</p>
                    <p className="mt-1 text-sm font-medium capitalize">
                      {integration.sync_frequency || 'Manual'}
                    </p>
                  </div>
                  {integration.token_expires_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Token expires</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDateTime(integration.token_expires_at)}
                      </p>
                    </div>
                  )}
                  {merchantId && (
                    <div>
                      <p className="text-sm text-muted-foreground">Merchant ID</p>
                      <p className="mt-1 text-sm font-medium font-mono truncate" title={merchantId}>
                        {merchantId}
                      </p>
                    </div>
                  )}
                  {locationId && (
                    <div>
                      <p className="text-sm text-muted-foreground">Primary location</p>
                      <p className="mt-1 text-sm font-medium font-mono truncate" title={locationId}>
                        {locationId}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between p-6 text-left hover:bg-muted/30 rounded-t-lg"
                  >
                    <div>
                      <CardTitle className="text-base">Advanced</CardTitle>
                      <CardDescription className="mt-1">
                        Account actions
                      </CardDescription>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4 border-t">
                    <div className="pt-4 space-y-2">
                      <p className="text-sm font-medium text-destructive">Disconnect Square</p>
                      <p className="text-sm text-muted-foreground">
                        Remove the connection. Imported data in Dose is kept.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsDisconnectDialogOpen(true)}
                        disabled={disconnectIntegration.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>

          <TabsContent value="data">
            <SquareDataView integrationId={id} />
          </TabsContent>
        </Tabs>

        <ConfirmationDialog
          open={isDisconnectDialogOpen}
          onOpenChange={setIsDisconnectDialogOpen}
          onConfirm={handleDisconnect}
          title="Disconnect integration"
          description="Are you sure you want to disconnect this integration? This will remove all connection data."
          confirmText="Disconnect"
          cancelText="Cancel"
          isPending={disconnectIntegration.isPending}
          variant="destructive"
        />
      </div>
    </AppLayout>
  );
}
