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
    queryFn: async () => {
      try {
        const data = await integrationsApi.getAll();
        // Ensure we always return an array
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching integrations:', error);
        // Return empty array on error to prevent infinite loops
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false, // Don't retry to prevent infinite loops on errors
    // Let the global config handle refetchOnMount, but ensure we have initial data
    placeholderData: [], // Use empty array as placeholder to prevent undefined issues
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
    mutationFn: ({ id, syncType, period }: {
      id: string;
      syncType?: 'orders' | 'payments' | 'catalog' | 'locations' | 'transactions' | 'full';
      period?: { mode: 'last_sync' | 'custom' | 'all'; startAt?: string; endAt?: string };
    }) =>
      integrationsApi.sync(id, syncType, period),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id, 'sync', 'jobs'] });
    },
  });
}

export function useImportBankFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => integrationsApi.importBankFile(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.id, 'sync', 'jobs'] });
    },
  });
}

export function useBackfillSaleItems() {
  return useMutation({
    mutationFn: ({ id, offset, limit }: { id: string; offset?: number; limit?: number }) =>
      integrationsApi.backfillSaleItems(id, { offset, limit }),
  });
}

export function useSyncJobs(integrationId: string) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'sync', 'jobs'],
    queryFn: () => integrationsApi.getSyncJobs(integrationId),
    enabled: !!integrationId,
    refetchInterval: (query) => {
      const jobs = query.state.data as { status?: string }[] | undefined;
      const hasPending = Array.isArray(jobs) && jobs.some((j) => j.status === 'pending' || j.status === 'processing');
      return hasPending ? 2000 : false;
    },
  });
}

export function useSyncJob(jobId: number | null) {
  return useQuery({
    queryKey: ['sync-jobs', jobId],
    queryFn: () => integrationsApi.getSyncJob(jobId!),
    enabled: jobId != null,
    refetchInterval: (query) => {
      const data = query.state.data as { status?: string } | undefined;
      return data?.status === 'pending' || data?.status === 'processing' ? 2000 : false;
    },
  });
}

export function useRetrySyncJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => integrationsApi.retrySyncJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['sync-jobs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['sync-jobs', 'all'] });
    },
  });
}

export function useAllSyncJobs(filters?: { status?: string; integration_id?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['sync-jobs', 'all', filters],
    queryFn: async () => {
      const res = await integrationsApi.getAllSyncJobs(filters);
      return res.jobs ?? [];
    },
    refetchInterval: (query) => {
      const jobs = query.state.data as { status?: string }[] | undefined;
      const hasPending = Array.isArray(jobs) && jobs.some((j) => j.status === 'pending' || j.status === 'processing');
      return hasPending ? 2500 : false;
    },
  });
}

// Square-specific hooks
export function useSquareLocations(integrationId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'locations'],
    queryFn: async () => {
      const response = await integrationsApi.square.getLocations(integrationId);
      return response.locations || [];
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!integrationId,
    retry: false, // Don't retry on auth errors
  });
}

export function useSquareOrders(
  integrationId: string,
  params?: {
    location_ids?: string[];
    query?: any;
    limit?: number;
    cursor?: string;
  },
  options?: { enabled?: boolean }
) {
  const stableKey = params
    ? [
        params.location_ids?.slice().sort().join(',') ?? '',
        params.limit,
        params.cursor,
        params.query ? JSON.stringify(params.query) : '',
      ]
    : '';
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'orders', stableKey],
    queryFn: () => integrationsApi.square.getOrders(integrationId, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!integrationId,
    retry: false, // Don't retry on auth errors
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
  },
  options?: { enabled?: boolean }
) {
  const stableKey = params
    ? [
        params.begin_time,
        params.end_time,
        params.sort_order,
        params.cursor,
        params.location_id,
        params.limit,
      ]
    : '';
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'payments', stableKey],
    queryFn: () => integrationsApi.square.getPayments(integrationId, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!integrationId,
    retry: false, // Don't retry on auth errors
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
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'square', 'catalog', params],
    queryFn: () => integrationsApi.square.getCatalog(integrationId, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!integrationId,
    retry: false, // Don't retry on auth errors
  });
}

