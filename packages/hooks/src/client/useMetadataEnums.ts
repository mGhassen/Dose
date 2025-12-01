// React Query hooks for Metadata Enums
// Consolidated hooks for both fetching enum values and managing enums

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@kit/lib/api';
import {
  getAllMetadataEnums,
  getMetadataEnumById,
  getEnumValuesByEnumId,
  createMetadataEnum,
  updateMetadataEnum,
  deleteMetadataEnum,
  createEnumValue,
  updateEnumValue,
  deleteEnumValue,
  type MetadataEnum,
  type CreateMetadataEnumData,
  type UpdateMetadataEnumData,
  type CreateEnumValueData,
  type UpdateEnumValueData,
} from '@kit/lib/api/metadata-enums';

// Export the interface for use in other files
export interface MetadataEnumValue {
  id: number;
  name: string;
  label: string;
  description?: string;
  isActive?: boolean;
  value?: number;
}

/**
 * Hook to fetch enum values for a specific enum name
 * Used by components that need enum options (e.g., dropdowns, selects)
 * @param enumName - The name of the enum (e.g., 'ExpenseCategory', 'ExpenseRecurrence')
 * @returns Array of enum values
 */
export function useEnumValues(enumName: string): MetadataEnumValue[] {
  const { data = [] } = useQuery({
    queryKey: ['metadataEnums', enumName],
    queryFn: async () => {
      const response = await apiFetch<MetadataEnumValue[]>(`/enums/${enumName}`);
      return response || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return data;
}

/**
 * Hook to fetch enum values for a specific enum name (returns query result)
 * @param enumName - The name of the enum (e.g., 'ExpenseCategory', 'ExpenseRecurrence')
 * @returns Query result with data, isLoading, etc.
 */
export function useMetadataEnum(enumName: string) {
  return useQuery({
    queryKey: ['metadataEnums', enumName],
    queryFn: async () => {
      const response = await apiFetch<MetadataEnumValue[]>(`/enums/${enumName}`);
      return response || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch all metadata enums (for management page)
 */
export function useMetadataEnums() {
  return useQuery({
    queryKey: ['metadataEnums', 'all'],
    queryFn: getAllMetadataEnums,
  });
}

/**
 * Hook to fetch enum values by enum ID (for management page)
 */
export function useEnumValuesByEnumId(enumId: number | null) {
  return useQuery({
    queryKey: ['metadataEnums', 'values', enumId],
    queryFn: () => getEnumValuesByEnumId(enumId!),
    enabled: !!enumId,
  });
}

export function useCreateEnumValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enumId, data }: { enumId: number; data: CreateEnumValueData }) =>
      createEnumValue(enumId, data),
    onSuccess: (_, { enumId }) => {
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'values', enumId] });
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'all'] });
      // Also invalidate the enum-specific cache
      queryClient.invalidateQueries({ queryKey: ['metadataEnums'] });
    },
  });
}

export function useUpdateEnumValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      enumId,
      valueId,
      data,
    }: {
      enumId: number;
      valueId: number;
      data: UpdateEnumValueData;
    }) => updateEnumValue(enumId, valueId, data),
    onSuccess: (_, { enumId }) => {
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'values', enumId] });
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'all'] });
      // Also invalidate the enum-specific cache
      queryClient.invalidateQueries({ queryKey: ['metadataEnums'] });
    },
  });
}

export function useDeleteEnumValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enumId, valueId }: { enumId: number; valueId: number }) =>
      deleteEnumValue(enumId, valueId),
    onSuccess: (_, { enumId }) => {
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'values', enumId] });
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'all'] });
      // Also invalidate the enum-specific cache
      queryClient.invalidateQueries({ queryKey: ['metadataEnums'] });
    },
  });
}

/**
 * Hook to fetch a single metadata enum by ID
 */
export function useMetadataEnumById(id: number | null) {
  return useQuery({
    queryKey: ['metadataEnums', 'byId', id],
    queryFn: () => getMetadataEnumById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new metadata enum
 */
export function useCreateMetadataEnum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMetadataEnumData) => createMetadataEnum(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['metadataEnums'] });
    },
  });
}

/**
 * Hook to update a metadata enum
 */
export function useUpdateMetadataEnum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMetadataEnumData }) =>
      updateMetadataEnum(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'byId', id] });
      queryClient.invalidateQueries({ queryKey: ['metadataEnums'] });
    },
  });
}

/**
 * Hook to delete a metadata enum
 */
export function useDeleteMetadataEnum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMetadataEnum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadataEnums', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['metadataEnums'] });
    },
  });
}

