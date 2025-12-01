// Metadata Enums API
// Client functions for fetching and managing metadata enums and their values

import { apiFetch } from '../api';
import { apiRequest } from './api';
import type { MetadataEnumValue } from '@kit/hooks';

export interface MetadataEnum {
  id: number;
  name: string;
  label: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  valueCount?: number;
}

export interface CreateEnumValueData {
  name: string;
  label: string;
  description?: string;
  value?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateEnumValueData extends Partial<CreateEnumValueData> {}

export interface CreateMetadataEnumData {
  name: string;
  label: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateMetadataEnumData extends Partial<CreateMetadataEnumData> {}

/**
 * Fetch enum values for a specific enum name
 * @param enumName - The name of the enum (e.g., 'ExpenseCategory', 'ExpenseRecurrence')
 * @returns Array of enum values
 */
export async function getEnumValues(enumName: string): Promise<MetadataEnumValue[]> {
  return apiFetch<MetadataEnumValue[]>(`/enums/${enumName}`);
}

/**
 * Get all metadata enums
 */
export async function getAllMetadataEnums(): Promise<MetadataEnum[]> {
  return apiRequest<MetadataEnum[]>('GET', '/api/metadata-enums');
}

/**
 * Get enum values for a specific enum by ID
 */
export async function getEnumValuesByEnumId(enumId: number): Promise<MetadataEnumValue[]> {
  return apiRequest<MetadataEnumValue[]>('GET', `/api/metadata-enums/${enumId}/values`);
}

/**
 * Create a new enum value
 */
export async function createEnumValue(
  enumId: number,
  data: CreateEnumValueData
): Promise<MetadataEnumValue> {
  return apiRequest<MetadataEnumValue>('POST', `/api/metadata-enums/${enumId}/values`, data);
}

/**
 * Update an enum value
 */
export async function updateEnumValue(
  enumId: number,
  valueId: number,
  data: UpdateEnumValueData
): Promise<MetadataEnumValue> {
  return apiRequest<MetadataEnumValue>(
    'PUT',
    `/api/metadata-enums/${enumId}/values/${valueId}`,
    data
  );
}

/**
 * Delete an enum value (soft delete)
 */
export async function deleteEnumValue(
  enumId: number,
  valueId: number
): Promise<void> {
  return apiRequest<void>(
    'DELETE',
    `/api/metadata-enums/${enumId}/values/${valueId}`
  );
}

/**
 * Get a metadata enum by ID
 */
export async function getMetadataEnumById(id: number): Promise<MetadataEnum> {
  return apiRequest<MetadataEnum>('GET', `/api/metadata-enums/${id}`);
}

/**
 * Create a new metadata enum
 */
export async function createMetadataEnum(
  data: CreateMetadataEnumData
): Promise<MetadataEnum> {
  return apiRequest<MetadataEnum>('POST', '/api/metadata-enums', data);
}

/**
 * Update a metadata enum
 */
export async function updateMetadataEnum(
  id: number,
  data: UpdateMetadataEnumData
): Promise<MetadataEnum> {
  return apiRequest<MetadataEnum>('PUT', `/api/metadata-enums/${id}`, data);
}

/**
 * Delete a metadata enum (soft delete)
 */
export async function deleteMetadataEnum(id: number): Promise<void> {
  return apiRequest<void>('DELETE', `/api/metadata-enums/${id}`);
}
