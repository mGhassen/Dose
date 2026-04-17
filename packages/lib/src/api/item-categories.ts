import { apiRequest } from './api';

export interface ItemCategory {
  id: number;
  name: string;
  label: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemCategoryData {
  name?: string;
  label: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateItemCategoryData extends Partial<CreateItemCategoryData> {}

export async function getItemCategories(options?: { includeInactive?: boolean }): Promise<ItemCategory[]> {
  const qs = options?.includeInactive ? '?includeInactive=1' : '';
  const res = await apiRequest<ItemCategory[]>('GET', `/api/item-categories${qs}`);
  return res ?? [];
}

export async function createItemCategory(data: CreateItemCategoryData): Promise<ItemCategory> {
  return apiRequest<ItemCategory>('POST', '/api/item-categories', data);
}

export async function updateItemCategory(id: number, data: UpdateItemCategoryData): Promise<ItemCategory> {
  return apiRequest<ItemCategory>('PATCH', `/api/item-categories/${id}`, data);
}

export async function deleteItemCategory(id: number): Promise<void> {
  return apiRequest<void>('DELETE', `/api/item-categories/${id}`);
}
