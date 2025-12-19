"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIntegrationById, useSyncIntegration, useDisconnectIntegration } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { 
  Square, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  ArrowLeft,
  Settings,
  ShoppingCart,
  CreditCard,
  Package,
  MapPin,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { useToast } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import SquareDataView from '../square-data-view';
import { Alert, AlertDescription } from '@kit/ui/alert';

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
  const { data: integration, isLoading } = useIntegrationById(id);
  const syncIntegration = useSyncIntegration();
  const disconnectIntegration = useDisconnectIntegration();
  const { toast } = useToast();

  const handleSync = async (syncType: 'orders' | 'payments' | 'catalog' | 'locations' | 'full' = 'full') => {
    try {
      await syncIntegration.mutateAsync({
        id: id,
        syncType,
      });
      toast({
        title: 'Sync Started',
        description: 'Data synchronization has been started.',
      });
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync data',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this integration? This will remove all connection data.')) {
      return;
    }

    try {
      await disconnectIntegration.mutateAsync(id);
      toast({
        title: 'Disconnected',
        description: 'Integration has been disconnected successfully.',
      });
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
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{integration.name}</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your {integration.integration_type} integration settings and data
                </p>
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
            <TabsTrigger value="settings">Settings</TabsTrigger>
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

            {/* Sync Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Information</CardTitle>
                <CardDescription>Last sync status and history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="text-sm font-medium mt-1">
                      {integration.last_sync_at ? formatDateTime(integration.last_sync_at) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sync Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {integration.last_sync_status === 'success' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {integration.last_sync_status === 'error' && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {integration.last_sync_status === 'in_progress' && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      <p className="text-sm font-medium capitalize">
                        {integration.last_sync_status || 'Not synced'}
                      </p>
                    </div>
                  </div>
                </div>

                {integration.last_sync_error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>{integration.last_sync_error}</p>
                        {integration.last_sync_error.includes('Unauthorized') || integration.last_sync_error.includes('Access token') ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/settings/integrations/${integration.id}?tab=settings`)}
                            className="mt-2"
                          >
                            Reconnect Integration
                          </Button>
                        ) : null}
                      </div>
                    </AlertDescription>
                  </Alert>
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

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>
                  Permanently disconnect this integration. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnectIntegration.isPending}
                >
                  {disconnectIntegration.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Disconnect Integration
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

