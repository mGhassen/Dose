"use client";

import { useRouter } from 'next/navigation';
import { useIntegrations } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { 
  Square, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  ArrowLeft,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { formatDateTime } from '@kit/lib/date-format';

const AVAILABLE_INTEGRATIONS = [
  {
    type: 'square',
    name: 'Square POS',
    icon: Square,
    color: 'text-blue-500',
  },
];

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

export default function ConnectedIntegrationsPage() {
  const router = useRouter();
  const { data: integrations, isLoading } = useIntegrations();

  const connectedIntegrations = integrations?.filter(i => i.status === 'connected') || [];

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings/integrations')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Connected Integrations</h1>
              <p className="text-muted-foreground mt-1">
                Manage your active integrations and sync data
              </p>
            </div>
          </div>
          <Badge variant="default" className="bg-green-500">{connectedIntegrations.length} Active</Badge>
        </div>

        {connectedIntegrations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4 py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">No Connected Integrations</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect an integration to get started
                  </p>
                </div>
                <Button onClick={() => router.push('/settings/integrations')}>
                  Browse Integrations
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectedIntegrations.map((integration) => {
              const integrationInfo = AVAILABLE_INTEGRATIONS.find(i => i.type === integration.integration_type);
              const Icon = integrationInfo?.icon || getIntegrationIcon(integration.integration_type);
              
              return (
                <Card 
                  key={integration.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer border-green-200 dark:border-green-900" 
                  onClick={() => router.push(`/settings/integrations/${integration.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${integrationInfo?.color || 'text-gray-500'} bg-opacity-10`}>
                          <Icon className={`h-5 w-5 ${integrationInfo?.color || 'text-gray-500'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name || integrationInfo?.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {integration.integration_type}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(integration.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Sync</span>
                        <span className="font-medium">
                          {integration.last_sync_at
                            ? formatDateTime(integration.last_sync_at)
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Sync Status</span>
                        <Badge variant={integration.last_sync_status === 'success' ? 'default' : 'secondary'} className="text-xs">
                          {integration.last_sync_status || 'Not synced'}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/settings/integrations/${integration.id}`);
                        }}
                      >
                        Manage
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

