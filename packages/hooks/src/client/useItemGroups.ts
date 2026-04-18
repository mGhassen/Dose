import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getItemGroups,
  getItemGroupById,
  createItemGroup,
  updateItemGroup,
  deleteItemGroup,
} from '@kit/lib';
import type { CreateItemGroupData, UpdateItemGroupData } from '@kit/types';

export function useItemGroups() {
  return useQuery({
    queryKey: ['item-groups'],
    queryFn: () => getItemGroups(),
  });
}

export function useItemGroup(id: number | null | undefined) {
  return useQuery({
    queryKey: ['item-groups', id],
    queryFn: () => getItemGroupById(id as number),
    enabled: id != null,
  });
}

function invalidateItemsAndGroups(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['item-groups'] });
  qc.invalidateQueries({ queryKey: ['items'] });
  qc.invalidateQueries({ queryKey: ['stock-movements'] });
  qc.invalidateQueries({ queryKey: ['stock-movements-analytics'] });
  qc.invalidateQueries({ queryKey: ['stock-levels'] });
}

export function useCreateItemGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemGroupData) => createItemGroup(data),
    onSuccess: () => invalidateItemsAndGroups(qc),
  });
}

export function useUpdateItemGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateItemGroupData }) =>
      updateItemGroup(id, data),
    onSuccess: (_, vars) => {
      invalidateItemsAndGroups(qc);
      qc.invalidateQueries({ queryKey: ['item-groups', vars.id] });
    },
  });
}

export function useDeleteItemGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteItemGroup(id),
    onSuccess: () => invalidateItemsAndGroups(qc),
  });
}
