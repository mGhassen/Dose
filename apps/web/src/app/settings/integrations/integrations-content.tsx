"use client";

import { useState, useEffect } from 'react';
import { useIntegrations, useIntegrationByType, useInitiateOAuth, useCompleteOAuth, useSyncIntegration, useDisconnectIntegration } from '@kit/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { 
  Settings, 
  Square, 
  Link2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Store,
  ShoppingCart,
  CreditCard,
  Package,
  MapPin,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import SquareDataView from './square-data-view';
import { Alert, AlertDescription } from '@kit/ui/alert';

export default function IntegrationsContent() {
  const { data: integrations, isLoading } = useIntegrations();
  const { data: squareIntegration } = useIntegrationByType('square');
  const initiateOAuth = useInitiateOAuth();
  const completeOAuth = useCompleteOAuth();
  const syncIntegration = useSyncIntegration();
  const disconnectIntegration = useDisconnectIntegration();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Check if we're returning from OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      toast({
        title: 'Connection Failed',
        description: error,
        variant: 'destructive',
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleConnectSquare = async () => {
    try {
      setIsConnecting(true);
      const result = await initiateOAuth.mutateAsync({
        integrationType: 'square',
        redirectUrl: window.location.origin + '/settings/integrations',
      });

      if (result?.auth_url) {
        // Store state in sessionStorage for verification
        sessionStorage.setItem('square_oauth_state', result.state);
        // Redirect to Square OAuth
        window.location.href = result.auth_url;
      }
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to initiate Square connection',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const storedState = sessionStorage.getItem('square_oauth_state');
      if (storedState !== state) {
        throw new Error('Invalid state parameter');
      }

      await completeOAuth.mutateAsync({
        integrationType: 'square',
        code,
        state,
      });

      sessionStorage.removeItem('square_oauth_state');
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);

      toast({
        title: 'Connected Successfully',
        description: 'Square integration has been connected successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to complete Square connection',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async (integrationId: number, syncType: 'orders' | 'payments' | 'catalog' | 'locations' | 'full' = 'full') => {
    try {
      await syncIntegration.mutateAsync({
        id: integrationId.toString(),
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

  const handleDisconnect = async (integrationId: number) => {
    if (!confirm('Are you sure you want to disconnect this integration? This will remove all connection data.')) {
      return;
    }

    try {
      await disconnectIntegration.mutateAsync(integrationId.toString());
      toast({
        title: 'Disconnected',
        description: 'Integration has been disconnected successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Disconnect Failed',
        description: error.message || 'Failed to disconnect integration',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your business tools to automatically sync data and streamline your workflow.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {squareIntegration && (
            <>
              <TabsTrigger value="square">Square POS</TabsTrigger>
              <TabsTrigger value="data">Square Data</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Square Integration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Square className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Square POS</CardTitle>
                    <CardDescription>
                      Connect your Square Point of Sale to automatically sync orders, payments, and catalog data.
                    </CardDescription>
                  </div>
                </div>
                {squareIntegration ? (
                  <div className="flex items-center gap-2">
                    {getStatusBadge(squareIntegration.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(squareIntegration.id)}
                      disabled={disconnectIntegration.isPending}
                    >
                      {disconnectIntegration.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Disconnect
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectSquare}
                    disabled={isConnecting || initiateOAuth.isPending}
                  >
                    {isConnecting || initiateOAuth.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 mr-2" />
                        Connect Square
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            {squareIntegration && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="text-sm font-medium">
                      {squareIntegration.last_sync_at
                        ? formatDateTime(squareIntegration.last_sync_at)
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sync Status</p>
                    <div className="flex items-center gap-2">
                      {squareIntegration.last_sync_status === 'success' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {squareIntegration.last_sync_status === 'error' && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {squareIntegration.last_sync_status === 'in_progress' && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      <p className="text-sm font-medium capitalize">
                        {squareIntegration.last_sync_status || 'Not synced'}
                      </p>
                    </div>
                  </div>
                </div>

                {squareIntegration.last_sync_error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{squareIntegration.last_sync_error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(squareIntegration.id, 'full')}
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
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(squareIntegration.id, 'orders')}
                    disabled={syncIntegration.isPending}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Sync Orders
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(squareIntegration.id, 'payments')}
                    disabled={syncIntegration.isPending}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Sync Payments
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(squareIntegration.id, 'catalog')}
                    disabled={syncIntegration.isPending}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Sync Catalog
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Configuration</p>
                  <div className="space-y-2 text-sm">
                    {squareIntegration.config?.merchant_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Merchant ID:</span>
                        <span className="font-mono">{squareIntegration.config.merchant_id}</span>
                      </div>
                    )}
                    {squareIntegration.config?.location_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location ID:</span>
                        <span className="font-mono">{squareIntegration.config.location_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sync Frequency:</span>
                      <span className="capitalize">{squareIntegration.sync_frequency}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Available Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>Available Integrations</CardTitle>
              <CardDescription>
                More integrations coming soon. Connect your favorite business tools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Square className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Square POS</p>
                      <p className="text-sm text-muted-foreground">Orders, Payments, Catalog</p>
                    </div>
                  </div>
                  {squareIntegration ? (
                    <Badge variant="default">Connected</Badge>
                  ) : (
                    <Badge variant="outline">Available</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5" />
                    <div>
                      <p className="font-medium">More integrations</p>
                      <p className="text-sm text-muted-foreground">Coming soon</p>
                    </div>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {squareIntegration && (
          <>
            <TabsContent value="square" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Square Integration Details</CardTitle>
                  <CardDescription>
                    Manage your Square POS connection and sync settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Connection Status</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(squareIntegration.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connected:</span>
                        <span>{formatDateTime(squareIntegration.created_at)}</span>
                      </div>
                      {squareIntegration.token_expires_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Token Expires:</span>
                          <span>{formatDateTime(squareIntegration.token_expires_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Sync Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Sync:</span>
                        <span>
                          {squareIntegration.last_sync_at
                            ? formatDateTime(squareIntegration.last_sync_at)
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sync Frequency:</span>
                        <span className="capitalize">{squareIntegration.sync_frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sync Status:</span>
                        <span className="capitalize">{squareIntegration.last_sync_status || 'Not synced'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Account Information</h3>
                    <div className="space-y-2">
                      {squareIntegration.config?.merchant_id && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Merchant ID:</span>
                          <span className="font-mono text-sm">{squareIntegration.config.merchant_id}</span>
                        </div>
                      )}
                      {squareIntegration.config?.location_id && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location ID:</span>
                          <span className="font-mono text-sm">{squareIntegration.config.location_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={() => handleDisconnect(squareIntegration.id)}
                      disabled={disconnectIntegration.isPending}
                    >
                      {disconnectIntegration.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Disconnect Integration
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data">
              <SquareDataView integrationId={squareIntegration.id.toString()} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

