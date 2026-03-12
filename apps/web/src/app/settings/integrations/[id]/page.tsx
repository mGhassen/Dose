"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIntegrationById, useSyncIntegration, useSyncJobs, useRetrySyncJob, useDisconnectIntegration } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@kit/ui/dropdown-menu';
import Link from 'next/link';
import { 
  Square, 
  Wallet,
  Settings,
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  Package,
  MapPin,
  AlertCircle,
  Trash2,
  MoreVertical,
  Activity,
} from 'lucide-react';
import { useToast } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import SquareDataView from '../square-data-view';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { ConfirmationDialog } from '@/components/confirmation-dialog';

function getStatusBadge(status: string) {
  switch (status) {
    case 'connected':
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>;
    case 'pending':
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case 'error':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
    case 'disconnected':
      return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getIntegrationIcon(type: string) {
  switch (type) {
    case 'square':
      return Square;
    case 'pennylane':
      return Wallet;
    default:
      return Settings;
  }
}

export default function IntegrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  if (!resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return <IntegrationDetailContent id={resolvedParams.id} activeTab={activeTab} setActiveTab={setActiveTab} />;
}

function IntegrationDetailContent({ id, activeTab, setActiveTab }: { id: string; activeTab: string; setActiveTab: (tab: string) => void }) {
  const router = useRouter();
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const { data: integration, isLoading } = useIntegrationById(id);
  const syncIntegration = useSyncIntegration();
  const { data: syncJobs = [] } = useSyncJobs(id);
  const retrySyncJob = useRetrySyncJob();
  const disconnectIntegration = useDisconnectIntegration();
  const { toast } = useToast();

  const lastJob = Array.isArray(syncJobs) ? syncJobs[0] : null;

  const handleSync = async (syncType: 'orders' | 'payments' | 'catalog' | 'locations' | 'transactions' | 'full' = 'full') => {
    try {
      const res = await syncIntegration.mutateAsync({ id, syncType });
      const jobId = res?.job_id;
      if (jobId != null) {
        window.location.href = `/settings/integrations/syncs/${jobId}`;
        if (res && 'status' in res && res.status === 'failed') {
          toast({ title: 'Sync failed', description: res.error_message ?? 'See job for details.', variant: 'destructive' });
        } else {
          toast({ title: 'Redirecting to sync…', description: `Job #${jobId}` });
        }
        return;
      }
      if (res && 'status' in res && res.status === 'failed') {
        toast({ title: 'Sync Failed', description: res.error_message ?? 'Fetch failed.', variant: 'destructive' });
      } else {
        toast({ title: 'Sync Started', description: 'Data synchronization has been started.' });
      }
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync data',
        variant: 'destructive',
      });
    }
  };

  const handleRetryJob = async (jobId: number) => {
    try {
      await retrySyncJob.mutateAsync(jobId);
      toast({ title: 'Retry Started', description: 'Job has been queued for processing.' });
    } catch (e: any) {
      toast({ title: 'Retry Failed', description: e?.message || 'Failed to retry', variant: 'destructive' });
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
    } catch (error: any) {
      toast({
        title: 'Disconnect Failed',
        description: error.message || 'Failed to disconnect integration',
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

  const Icon = getIntegrationIcon(integration.integration_type);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings/integrations')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{integration.name}</h1>
                  <p className="text-muted-foreground mt-1">
                    Manage your {integration.integration_type} integration settings and data
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {integration.integration_type === 'pennylane' ? (
                      <DropdownMenuItem
                        onClick={() => handleSync('transactions')}
                        disabled={syncIntegration.isPending}
                      >
                        {syncIntegration.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Sync bank transactions
                          </>
                        )}
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleSync('full')}
                          disabled={syncIntegration.isPending}
                        >
                          {syncIntegration.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Sync All Data
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSync('orders')}
                          disabled={syncIntegration.isPending}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Sync Orders
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSync('payments')}
                          disabled={syncIntegration.isPending}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Sync Payments
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSync('catalog')}
                          disabled={syncIntegration.isPending}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Sync Catalog
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSync('locations')}
                          disabled={syncIntegration.isPending}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Sync Locations
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDisconnectDialogOpen(true)}
                      disabled={disconnectIntegration.isPending}
                      className="text-destructive focus:text-destructive"
                    >
                      {disconnectIntegration.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Disconnect
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          {getStatusBadge(integration.status)}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {integration.integration_type === 'square' && (
              <TabsTrigger value="data">Data</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>Current status and health of your integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(integration.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <p className="text-sm font-medium mt-1">{formatDateTime(integration.created_at)}</p>
                  </div>
                  {integration.token_expires_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Token Expires</p>
                      <p className="text-sm font-medium mt-1">{formatDateTime(integration.token_expires_at)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Sync Frequency</p>
                    <p className="text-sm font-medium mt-1 capitalize">{integration.sync_frequency || 'Manual'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {integration.integration_type === 'pennylane' && (
              <Card>
                <CardHeader>
                  <CardTitle>Bank transactions</CardTitle>
                  <CardDescription>View and reconcile imported bank statement lines</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild>
                    <Link href={`/bank-transactions?integration_id=${integration.id}`}>View bank transactions</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Sync Jobs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Information</CardTitle>
                <CardDescription>Last sync job status and history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lastJob ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Job #{lastJob.id}</p>
                        <p className="text-sm font-medium mt-1">{formatDateTime(lastJob.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {lastJob.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {lastJob.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                          {(lastJob.status === 'pending' || lastJob.status === 'processing') && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          )}
                          <Badge variant={lastJob.status === 'failed' ? 'destructive' : lastJob.status === 'completed' ? 'default' : 'secondary'}>
                            {lastJob.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {lastJob.stats && typeof lastJob.stats === 'object' && (
                      <p className="text-sm text-muted-foreground">
                        Imported: {[lastJob.stats.items_imported, lastJob.stats.orders_imported, lastJob.stats.payments_imported, lastJob.stats.transactions_imported].filter(Boolean).join(', ') || '—'}
                        {(lastJob.stats.items_failed || lastJob.stats.orders_failed || lastJob.stats.payments_failed) ? (
                          <span className="text-destructive ml-2">
                            Failed: {[lastJob.stats.items_failed, lastJob.stats.orders_failed, lastJob.stats.payments_failed].filter(Boolean).join(', ')}
                          </span>
                        ) : null}
                      </p>
                    )}
                    {lastJob.error_message && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{lastJob.error_message}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/settings/integrations/syncs?integration_id=${id}`}>
                          <Activity className="w-4 h-4 mr-1" />
                          View all syncs
                        </Link>
                      </Button>
                      {(lastJob.status === 'failed' || lastJob.status === 'completed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryJob(lastJob.id)}
                          disabled={retrySyncJob.isPending}
                        >
                          {retrySyncJob.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                          Retry
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No sync jobs yet. Use Sync from the menu above.</p>
                )}
              </CardContent>
            </Card>

            {/* Configuration Card */}
            {integration.config && Object.keys(integration.config).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>Integration-specific settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(integration.config).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {integration.integration_type === 'square' && (
            <TabsContent value="data">
              <SquareDataView 
                integrationId={id} 
                onSync={handleSync}
                isSyncing={syncIntegration.isPending}
              />
            </TabsContent>
          )}
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

