// React Query hooks for Subscriptions

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@kit/lib';
import type { 
  Subscription, 
  CreateSubscriptionData, 
  UpdateSubscriptionData
} from '@kit/types';

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.getAll,
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
    queryFn: () => subscriptionsApi.getByCategory(category),
    enabled: !!category,
  });
}

export function useActiveSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions', 'active'],
    queryFn: subscriptionsApi.getActive,
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

