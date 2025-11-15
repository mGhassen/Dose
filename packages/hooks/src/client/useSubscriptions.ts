// React Query hooks for Subscriptions

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@kit/lib';
import type { 
  Subscription, 
  CreateSubscriptionData, 
  UpdateSubscriptionData
} from '@kit/types';

export function useSubscriptions(params?: { page?: number; limit?: number; category?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['subscriptions', params],
    queryFn: async () => {
      try {
        const result = await subscriptionsApi.getAll(params);
        // Return full paginated response
        if (result && result !== null && typeof result === 'object' && 'data' in result && 'pagination' in result) {
          return result;
        }
        // If result is already an array (fallback for backward compatibility)
        if (Array.isArray(result)) {
          return {
            data: result,
            pagination: {
              page: 1,
              limit: result.length,
              total: result.length,
              totalPages: 1,
              hasMore: false,
            },
          };
        }
        console.warn('[useSubscriptions] Unexpected response format:', result);
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        };
      } catch (error) {
        console.error('[useSubscriptions] Error fetching subscriptions:', error);
        throw error;
      }
    },
  });
}

export function useSubscriptionById(id: string) {
  return useQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => subscriptionsApi.getById(id),
    enabled: !!id,
  });
}

export function useSubscriptionsByCategory(category: string) {
  return useQuery({
    queryKey: ['subscriptions', 'category', category],
    queryFn: async () => {
      const result = await subscriptionsApi.getByCategory(category);
      // Extract data from paginated response
      return result?.data || [];
    },
    enabled: !!category,
  });
}

export function useActiveSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions', 'active'],
    queryFn: async () => {
      const result = await subscriptionsApi.getActive();
      // Extract data from paginated response
      return result?.data || [];
    },
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: subscriptionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionData }) => 
      subscriptionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', variables.id] });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: subscriptionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

