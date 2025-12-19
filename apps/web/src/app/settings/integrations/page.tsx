"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIntegrations, useInitiateOAuth, useCompleteOAuth, useManualConnectIntegration } from '@kit/hooks';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/app-layout';
import { Button } from '@kit/ui/button';
import { 
  Square, 
  Link2, 
  Loader2,
  Key,
  Settings,
  Search,
  Plus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@kit/hooks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@kit/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Separator } from '@kit/ui/separator';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import type { Integration } from '@kit/types';

// Available integrations catalog
const AVAILABLE_INTEGRATIONS = [
  {
    type: 'square',
    name: 'Square POS',
    description: 'Sync orders, payments, and catalog data from your Square Point of Sale.',
    icon: Square,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    category: 'connector',
  },
  // Add more integrations here as they become available
];

// Built-in integrations (like Replit managed)
const BUILT_IN_INTEGRATIONS: any[] = [
  // Add built-in integrations here in the future
];

export default function IntegrationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: integrations, isLoading, refetch } = useIntegrations();
  const initiateOAuth = useInitiateOAuth();
  const completeOAuth = useCompleteOAuth();
  const manualConnect = useManualConnectIntegration();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'oauth' | 'manual'>('oauth');
  const [manualToken, setManualToken] = useState('');
  const [manualMerchantId, setManualMerchantId] = useState('');
  const [manualLocationId, setManualLocationId] = useState('');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOAuthCallback = React.useCallback(async (code: string, state: string, integrationType: string) => {
    try {
      const storedState = sessionStorage.getItem(`${integrationType}_oauth_state`);
      if (storedState !== state) {
        throw new Error('Invalid state parameter');
      }

      const result = await completeOAuth.mutateAsync({
        integrationType,
        code,
        state,
      });

      sessionStorage.removeItem(`${integrationType}_oauth_state`);
      window.history.replaceState({}, '', window.location.pathname);

      toast({
        title: 'Connected Successfully',
        description: `${integrationType} integration has been connected successfully.`,
      });

      if (result?.id) {
        router.push(`/settings/integrations/${result.id}`);
      } else {
        setTimeout(async () => {
          await queryClient.invalidateQueries({ queryKey: ['integrations'] });
          const updatedIntegrations = queryClient.getQueryData<Integration[]>(['integrations']);
          const integration = updatedIntegrations?.find((i: Integration) => i.integration_type === integrationType);
          if (integration) {
            router.push(`/settings/integrations/${integration.id}`);
          }
        }, 500);
      }
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to complete connection',
        variant: 'destructive',
      });
    }
  }, [completeOAuth, toast, router, queryClient]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const integrationType = urlParams.get('integration_type') || 'square';

    if (error) {
      toast({
        title: 'Connection Failed',
        description: error,
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state, integrationType);
    }
  }, [handleOAuthCallback, toast]);

  const handleConnect = async (integrationType: string) => {
    try {
      setIsConnecting(true);
      const result = await initiateOAuth.mutateAsync({
        integrationType,
        redirectUrl: `${window.location.origin}/settings/integrations?integration_type=${integrationType}`,
      });

      if (result?.auth_url) {
        sessionStorage.setItem(`${integrationType}_oauth_state`, result.state);
        window.location.href = result.auth_url;
      }
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to initiate connection',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const handleManualConnect = async (integrationType: string) => {
    if (!manualToken) {
      toast({
        title: 'Missing Token',
        description: 'Please enter an access token',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await manualConnect.mutateAsync({
        integration_type: integrationType,
        access_token: manualToken,
        merchant_id: manualMerchantId || undefined,
        location_id: manualLocationId || undefined,
      });

      setShowConnectDialog(false);
      setConnectionMode('oauth');
      setManualToken('');
      setManualMerchantId('');
      setManualLocationId('');

      // Invalidate and refetch integrations to update the UI
      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      await refetch();

      toast({
        title: 'Connected Successfully',
        description: `${integrationType} integration connected manually.`,
      });

      if (result?.id) {
        router.push(`/settings/integrations/${result.id}`);
      } else {
        // Wait a bit for the query to update, then find and redirect
        setTimeout(async () => {
          const { data: updatedIntegrations } = await refetch();
          const integration = updatedIntegrations?.find((i: Integration) => i.integration_type === integrationType);
          if (integration) {
            router.push(`/settings/integrations/${integration.id}`);
          }
        }, 500);
      }
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect',
        variant: 'destructive',
      });
    }
  };

  // Ensure integrations is always an array
  const integrationsList = Array.isArray(integrations) ? integrations : [];
  
  // Filter integrations based on search
  const filteredConnectors = AVAILABLE_INTEGRATIONS.filter(integration => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return integration.name.toLowerCase().includes(query) || 
           integration.description.toLowerCase().includes(query);
  });

  // Get connected integrations - show if status is 'connected' (regardless of is_active)
  // This ensures connected integrations are always shown
  const connectedIntegrations = integrationsList.filter(i => 
    i.status === 'connected'
  );
  
  // Create a map for quick lookup by integration type
  const connectedIntegrationMap = new Map(
    connectedIntegrations.map(i => [i.integration_type, i])
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="default">
              <Plus className="h-4 w-4 mr-2" />
              Request an integration
            </Button>
          </div>
        </div>

        {/* Built-in Integrations Section */}
        {BUILT_IN_INTEGRATIONS.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Built-in Integrations</h2>
              <p className="text-sm text-muted-foreground mt-1">
                These are built-in integrations that work automatically. Create an app and your agent can start using these right away.
              </p>
            </div>
            <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] py-2"></TableHead>
                  <TableHead className="py-2">Name</TableHead>
                  <TableHead className="py-2">Type</TableHead>
                  <TableHead className="text-right py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                  {BUILT_IN_INTEGRATIONS.map((integration) => {
                    const Icon = integration.icon || Settings;
                    return (
                      <TableRow key={integration.type}>
                        <TableCell className="py-3">
                          <div className={`p-1.5 rounded ${integration.bgColor || 'bg-muted'} bg-opacity-10 w-fit`}>
                            <Icon className={`h-4 w-4 ${integration.color || 'text-muted-foreground'}`} />
                          </div>
                        </TableCell>
                        <TableCell className="py-3 font-medium">{integration.name}</TableCell>
                        <TableCell className="py-3 text-muted-foreground text-sm">{integration.type}</TableCell>
                        <TableCell className="py-3 text-right">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-sm">
                            Learn more
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Connectors Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Connectors</h2>
            <p className="text-sm text-muted-foreground mt-1">
              These are first-party integrations we support. Sign in once and build with them across your apps.
            </p>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] py-2"></TableHead>
                  <TableHead className="py-2">Name</TableHead>
                  <TableHead className="py-2">Description</TableHead>
                  <TableHead className="text-right py-2">Connection Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConnectors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No integrations found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConnectors.map((integration) => {
                    const Icon = integration.icon;
                    const connectedIntegration = connectedIntegrationMap.get(integration.type as any);
                    const isConnected = !!connectedIntegration && connectedIntegration.status === 'connected';

                    return (
                      <TableRow key={integration.type}>
                        <TableCell className="py-3">
                          <div className={`p-1.5 rounded ${integration.bgColor} bg-opacity-10 w-fit`}>
                            <Icon className={`h-4 w-4 ${integration.color}`} />
                          </div>
                        </TableCell>
                        <TableCell className="py-3 font-medium">{integration.name}</TableCell>
                        <TableCell className="py-3 text-muted-foreground text-sm">{integration.description}</TableCell>
                        <TableCell className="py-3 text-right">
                          {isConnected ? (
                            <div className="flex items-center justify-end gap-3">
                              <div className="flex items-center gap-1.5 text-sm">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                                <span className="text-muted-foreground">Active</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/settings/integrations/${connectedIntegration.id}`)}
                                className="h-8 px-2 text-sm"
                              >
                                Manage
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedIntegration(integration.type as string);
                                setConnectionMode('oauth');
                                setShowConnectDialog(true);
                              }}
                              disabled={isConnecting || initiateOAuth.isPending}
                            >
                              {isConnecting && selectedIntegration === integration.type ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : null}
                              Sign in
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Connect Integration Dialog */}
        <Dialog open={showConnectDialog} onOpenChange={(open) => {
          setShowConnectDialog(open);
          if (!open) {
            setSelectedIntegration(null);
            setConnectionMode('oauth');
            setManualToken('');
            setManualMerchantId('');
            setManualLocationId('');
          }
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Connect {selectedIntegration ? AVAILABLE_INTEGRATIONS.find(i => i.type === selectedIntegration)?.name : ''}
              </DialogTitle>
              <DialogDescription>
                Choose your preferred connection method to integrate with your account
              </DialogDescription>
            </DialogHeader>

            <Tabs value={connectionMode} onValueChange={(value) => setConnectionMode(value as 'oauth' | 'manual')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  OAuth (Recommended)
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Manual (Sandbox)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oauth" className="space-y-4 mt-6">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                      <Link2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold">Secure OAuth Connection</h4>
                      <p className="text-sm text-muted-foreground">
                        Connect securely through OAuth flow. This is the recommended method for production use and provides automatic token refresh.
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>Automatic token refresh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>Secure credential management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>Production-ready</span>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    if (selectedIntegration) {
                      setShowConnectDialog(false);
                      handleConnect(selectedIntegration);
                    }
                  }}
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
                      Connect with OAuth
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-6">
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100">Sandbox Testing Only</p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        Manual connection is intended for development and testing purposes only. For production use, please use OAuth.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="access_token" className="text-base font-medium">
                      Access Token <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="access_token"
                      placeholder="EAAAEI..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      rows={4}
                      className="font-mono text-sm mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Get your access token from Square Developer Console → OAuth → Sandbox Test Accounts → Authorize test account
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="merchant_id" className="text-base font-medium">Merchant ID</Label>
                      <Input
                        id="merchant_id"
                        placeholder="ML..."
                        value={manualMerchantId}
                        onChange={(e) => setManualMerchantId(e.target.value)}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Optional</p>
                    </div>
                    <div>
                      <Label htmlFor="location_id" className="text-base font-medium">Location ID</Label>
                      <Input
                        id="location_id"
                        placeholder="Location ID"
                        value={manualLocationId}
                        onChange={(e) => setManualLocationId(e.target.value)}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Optional</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => selectedIntegration && handleManualConnect(selectedIntegration)}
                  disabled={manualConnect.isPending || !selectedIntegration || !manualToken}
                  className="w-full"
                  size="lg"
                >
                  {manualConnect.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Connect Manually
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
