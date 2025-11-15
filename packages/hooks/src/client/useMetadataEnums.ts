// React Query hooks for Metadata Enums

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@kit/lib/api';

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
 * @param enumName - The name of the enum (e.g., 'Role', 'ActionType')
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
 * @param enumName - The name of the enum (e.g., 'Role', 'ActionType')
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

