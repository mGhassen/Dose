import { apiRequest } from './api';
import type { 
  Subscription, 
  CreateSubscriptionData, 
  UpdateSubscriptionData,
  SubscriptionProjection,
  PaginatedResponse,
  PaginationParams
} from '@kit/types';

export const subscriptionsApi = {
  getAll: (params?: PaginationParams & { category?: string; isActive?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Subscription>>('GET', `/api/subscriptions${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Subscription>('GET', `/api/subscriptions/${id}`),
  create: (data: CreateSubscriptionData) => apiRequest<Subscription>('POST', '/api/subscriptions', data),
  update: (id: string, data: UpdateSubscriptionData) => apiRequest<Subscription>('PUT', `/api/subscriptions/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/subscriptions/${id}`),
  getByCategory: (category: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append('category', category);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return apiRequest<PaginatedResponse<Subscription>>('GET', `/api/subscriptions?${searchParams.toString()}`);
  },
  getActive: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append('isActive', 'true');
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return apiRequest<PaginatedResponse<Subscription>>('GET', `/api/subscriptions?${searchParams.toString()}`);
  },
};

