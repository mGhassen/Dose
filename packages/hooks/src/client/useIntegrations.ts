// React Query hooks for Integrations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@kit/lib';
import type {
  Integration,
  CreateIntegrationData,
  UpdateIntegrationData,
  IntegrationSyncData,
  SquareLocation,
  SquareOrder,
  SquarePayment,
  SquareCatalogObject,
  SquareListOrdersResponse,
  SquareListPaymentsResponse,
  SquareListLocationsResponse,
  SquareListCatalogResponse,
} from '@kit/types';

// CRUD hooks
export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll(),
  });
}

export function useIntegrationById(id: string) {
  return useQuery({
    queryKey: ['integrations', id],
    queryFn: () => integrationsApi.getById(id),
    enabled: !!id,
  });
}

export function useIntegrationByType(type: string) {
  return useQuery({
    queryKey: ['integrations', 'type', type],
    queryFn: () => integrationsApi.getByType(type),
    enabled: !!type,
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: integrationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIntegrationData }) =>
      integrationsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id] });
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: integrationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

// OAuth hooks
export function useInitiateOAuth() {
  return useMutation({
    mutationFn: ({ integrationType, redirectUrl }: { integrationType: string; redirectUrl?: string }) =>
      integrationsApi.initiateOAuth(integrationType, redirectUrl),
  });
}

export function useCompleteOAuth() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ integrationType, code, state }: { integrationType: string; code: string; state: string }) =>
      integrationsApi.completeOAuth(integrationType, code, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useRefreshToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => integrationsApi.refreshToken(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', id] });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => integrationsApi.disconnect(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', id] });
    },
  });
}

export function useManualConnectIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { integration_type: string; access_token: string; merchant_id?: string; location_id?: string }) =>
      integrationsApi.manualConnect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

// Sync hooks
export function useSyncIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, syncType }: { id: string; syncType?: 'orders' | 'payments' | 'catalog' | 'locations' | 'full' }) =>
      integrationsApi.sync(id, syncType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id, 'sync'] });
    },
  });
}

export function useSyncStatus(integrationId: string) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'sync', 'status'],
    queryFn: () => integrationsApi.getSyncStatus(integrationId),
    enabled: !!integrationId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if sync is in progress
      if (data?.status === 'in_progress') {
        return 2000;
      }
      return false;
    },
  });
}

// Square-specific hooks
export function useSquareLocations(integrationId: string) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'locations'],
    queryFn: async () => {
      const response = await integrationsApi.square.getLocations(integrationId);
      return response.locations || [];
    },
    enabled: !!integrationId,
  });
}

export function useSquareOrders(
  integrationId: string,
  params?: {
    location_ids?: string[];
    query?: any;
    limit?: number;
    cursor?: string;
  }
) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'orders', params],
    queryFn: () => integrationsApi.square.getOrders(integrationId, params),
    enabled: !!integrationId,
  });
}

export function useSquareOrder(integrationId: string, orderId: string) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'orders', orderId],
    queryFn: () => integrationsApi.square.getOrder(integrationId, orderId),
    enabled: !!integrationId && !!orderId,
  });
}

export function useSquarePayments(
  integrationId: string,
  params?: {
    begin_time?: string;
    end_time?: string;
    sort_order?: string;
    cursor?: string;
    location_id?: string;
    total?: number;
    last_4?: string;
    card_brand?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'payments', params],
    queryFn: () => integrationsApi.square.getPayments(integrationId, params),
    enabled: !!integrationId,
  });
}

export function useSquarePayment(integrationId: string, paymentId: string) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'payments', paymentId],
    queryFn: () => integrationsApi.square.getPayment(integrationId, paymentId),
    enabled: !!integrationId && !!paymentId,
  });
}

export function useSquareCatalog(
  integrationId: string,
  params?: {
    types?: string[];
    cursor?: string;
    catalog_version?: number;
  }
) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'catalog', params],
    queryFn: () => integrationsApi.square.getCatalog(integrationId, params),
    enabled: !!integrationId,
  });
}

