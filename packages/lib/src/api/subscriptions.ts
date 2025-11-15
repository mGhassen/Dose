import { apiRequest } from './api';
import type { 
  Subscription, 
  CreateSubscriptionData, 
  UpdateSubscriptionData,
  SubscriptionProjection
} from '@kit/types';

export const subscriptionsApi = {
  getAll: () => apiRequest<Subscription[]>('GET', '/api/subscriptions'),
  getById: (id: string) => apiRequest<Subscription>('GET', `/api/subscriptions/${id}`),
  create: (data: CreateSubscriptionData) => apiRequest<Subscription>('POST', '/api/subscriptions', data),
  update: (id: string, data: UpdateSubscriptionData) => apiRequest<Subscription>('PUT', `/api/subscriptions/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/subscriptions/${id}`),
  getByCategory: (category: string) => apiRequest<Subscription[]>('GET', `/api/subscriptions?category=${category}`),
  getActive: () => apiRequest<Subscription[]>('GET', '/api/subscriptions?isActive=true'),
};

