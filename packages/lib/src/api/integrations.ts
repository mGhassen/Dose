import { apiRequest } from './api';
import type {
  Integration,
  CreateIntegrationData,
  UpdateIntegrationData,
  IntegrationSyncData,
  SyncJob,
  SyncJobWithErrors,
  SyncStartResponse,
  SquareLocation,
  SquareOrder,
  SquarePayment,
  SquareCatalogObject,
  SquareListOrdersResponse,
  SquareListPaymentsResponse,
  SquareListLocationsResponse,
  SquareListCatalogResponse,
  PaginatedResponse,
  PaginationParams,
} from '@kit/types';

export const integrationsApi = {
  // CRUD operations
  getAll: () => apiRequest<Integration[]>('GET', '/api/integrations'),
  getById: (id: string) => apiRequest<Integration>('GET', `/api/integrations/${id}`),
  create: (data: CreateIntegrationData) =>
    apiRequest<Integration>('POST', '/api/integrations', data),
  update: (id: string, data: UpdateIntegrationData) =>
    apiRequest<Integration>('PUT', `/api/integrations/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/integrations/${id}`),
  getByType: (type: string) =>
    apiRequest<Integration | null>('GET', `/api/integrations/type/${type}`),

  // OAuth operations
  initiateOAuth: (integrationType: string, redirectUrl?: string) =>
    apiRequest<{ auth_url: string; state: string }>(
      'POST',
      `/api/integrations/oauth/${integrationType}/initiate`,
      redirectUrl ? { redirect_url: redirectUrl } : undefined
    ),
  completeOAuth: (integrationType: string, code: string, state: string) =>
    apiRequest<Integration>(
      'POST',
      `/api/integrations/oauth/${integrationType}/callback`,
      { code, state }
    ),
  refreshToken: (id: string) =>
    apiRequest<Integration>('POST', `/api/integrations/${id}/refresh-token`),
  disconnect: (id: string) =>
    apiRequest<Integration>('POST', `/api/integrations/${id}/disconnect`),
  manualConnect: (data: { integration_type: string; access_token: string; merchant_id?: string; location_id?: string }) =>
    apiRequest<Integration>('POST', '/api/integrations/manual-connect', data),

  // Sync operations (async: returns job_id, processor runs in background)
  sync: (
    id: string,
    syncType?: 'orders' | 'payments' | 'catalog' | 'locations' | 'transactions' | 'full',
    period?: { mode: 'last_sync' | 'custom' | 'all'; startAt?: string; endAt?: string }
  ) =>
    apiRequest<SyncStartResponse>(
      'POST',
      `/api/integrations/${id}/sync`,
      {
        sync_type: syncType || 'full',
        period_mode: period?.mode,
        start_at: period?.startAt,
        end_at: period?.endAt,
      },
      undefined,
      { timeout: 120000 }
    ),
  importBankFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiRequest<{ job_id: number; message?: string }>('POST', `/api/integrations/${id}/import-bank-file`, formData, undefined, { timeout: 120000 });
  },
  importBulkFile: (id: string, file: File, entity: string) => {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('entity', entity);
    return apiRequest<{ job_id: number; message?: string }>('POST', `/api/integrations/${id}/import-bulk-file`, formData, undefined, { timeout: 120000 });
  },
  backfillSaleItems: (id: string, params?: { offset?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.offset != null) sp.set('offset', String(params.offset));
    if (params?.limit != null) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return apiRequest<{
      status: string;
      total: number | null;
      offset: number;
      limit: number;
      processed: number;
      next_offset: number | null;
      has_more: boolean;
      results: {
        sales_scanned: number;
        lines_updated: number;
        movements_written: number;
        missing_payload: number;
        unmapped_items: number;
        errors: number;
      };
      events: Array<{
        saleId: number;
        squareOrderId: string;
        status: 'missing_payload' | 'unmapped' | 'updated' | 'no_change' | 'error';
        lines_updated: number;
        movements_written: number;
        total_lines: number;
        message?: string;
      }>;
    }>(
      'POST',
      `/api/integrations/${id}/sync/backfill-sale-items${q ? `?${q}` : ''}`,
      undefined,
      undefined,
      { timeout: 300000 }
    );
  },
  getSyncJobs: (integrationId: string) =>
    apiRequest<SyncJob[]>('GET', `/api/integrations/${integrationId}/sync`),
  getSyncJob: (jobId: number) =>
    apiRequest<SyncJobWithErrors>('GET', `/api/sync-jobs/${jobId}`),
  retrySyncJob: (jobId: number) =>
    apiRequest<{ job_id: number; message: string }>('POST', `/api/sync-jobs/${jobId}/retry`),
  getAllSyncJobs: (params?: { status?: string; integration_id?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.integration_id) searchParams.set('integration_id', params.integration_id);
    if (params?.limit != null) searchParams.set('limit', String(params.limit));
    if (params?.offset != null) searchParams.set('offset', String(params.offset));
    const q = searchParams.toString();
    return apiRequest<{ jobs: (SyncJob & { integration_name?: string; integration_type?: string })[] }>(
      'GET',
      `/api/sync-jobs${q ? `?${q}` : ''}`
    );
  },

  // Square-specific data fetching
  square: {
    getLocations: (integrationId: string) =>
      apiRequest<SquareListLocationsResponse>(
        'GET',
        `/api/integrations/${integrationId}/square/locations`
      ),
    getOrders: (
      integrationId: string,
      params?: {
        location_ids?: string[];
        query?: {
          filter?: {
            state_filter?: {
              states?: string[];
            };
            date_time_filter?: {
              created_at?: {
                start_at?: string;
                end_at?: string;
              };
              updated_at?: {
                start_at?: string;
                end_at?: string;
              };
              closed_at?: {
                start_at?: string;
                end_at?: string;
              };
            };
          };
          sort?: {
            sort_field?: string;
            sort_order?: string;
          };
        };
        limit?: number;
        cursor?: string;
      }
    ) => {
      const searchParams = new URLSearchParams();
      if (params?.location_ids) {
        params.location_ids.forEach((id) => searchParams.append('location_ids', id));
      }
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.cursor) searchParams.append('cursor', params.cursor);
      if (params?.query) {
        searchParams.append('query', JSON.stringify(params.query));
      }
      const query = searchParams.toString();
      return apiRequest<SquareListOrdersResponse>(
        'GET',
        `/api/integrations/${integrationId}/square/orders${query ? `?${query}` : ''}`,
        undefined,
        undefined,
        { timeout: 60000 }
      );
    },
    getPayments: (
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
    ) => {
      const searchParams = new URLSearchParams();
      if (params?.begin_time) searchParams.append('begin_time', params.begin_time);
      if (params?.end_time) searchParams.append('end_time', params.end_time);
      if (params?.sort_order) searchParams.append('sort_order', params.sort_order);
      if (params?.cursor) searchParams.append('cursor', params.cursor);
      if (params?.location_id) searchParams.append('location_id', params.location_id);
      if (params?.total) searchParams.append('total', params.total.toString());
      if (params?.last_4) searchParams.append('last_4', params.last_4);
      if (params?.card_brand) searchParams.append('card_brand', params.card_brand);
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      return apiRequest<SquareListPaymentsResponse>(
        'GET',
        `/api/integrations/${integrationId}/square/payments${query ? `?${query}` : ''}`,
        undefined,
        undefined,
        { timeout: 60000 }
      );
    },
    getCatalog: (
      integrationId: string,
      params?: {
        types?: string[];
        cursor?: string;
        catalog_version?: number;
      }
    ) => {
      const searchParams = new URLSearchParams();
      if (params?.types) {
        params.types.forEach((type) => searchParams.append('types', type));
      }
      if (params?.cursor) searchParams.append('cursor', params.cursor);
      if (params?.catalog_version)
        searchParams.append('catalog_version', params.catalog_version.toString());
      const query = searchParams.toString();
      return apiRequest<SquareListCatalogResponse>(
        'GET',
        `/api/integrations/${integrationId}/square/catalog${query ? `?${query}` : ''}`
      );
    },
    getOrder: (integrationId: string, orderId: string) =>
      apiRequest<SquareOrder>('GET', `/api/integrations/${integrationId}/square/orders/${orderId}`),
    getPayment: (integrationId: string, paymentId: string) =>
      apiRequest<SquarePayment>(
        'GET',
        `/api/integrations/${integrationId}/square/payments/${paymentId}`
      ),
  },
};

