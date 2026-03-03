import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  type Unit,
  type CreateUnitData,
  type UpdateUnitData,
} from '@kit/lib/api/units';

export type { Unit };

export function useUnits(params?: { dimension?: string }) {
  return useQuery({
    queryKey: ['units', params],
    queryFn: () => getUnits(params),
  });
}

export function useUnit(id: number | null) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: () => getUnitById(id!),
    enabled: !!id,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUnitData) => createUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUnitData }) => updateUnit(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['units', id] });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
}
