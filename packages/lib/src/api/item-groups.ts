import { apiRequest } from './api';
import type { ItemGroup, CreateItemGroupData, UpdateItemGroupData } from '@kit/types';

export async function getItemGroups(): Promise<ItemGroup[]> {
  const res = await apiRequest<ItemGroup[]>('GET', '/api/item-groups');
  return res ?? [];
}

export async function getItemGroupById(id: number): Promise<ItemGroup> {
  return apiRequest<ItemGroup>('GET', `/api/item-groups/${id}`);
}

export async function createItemGroup(data: CreateItemGroupData): Promise<ItemGroup> {
  return apiRequest<ItemGroup>('POST', '/api/item-groups', data);
}

export async function updateItemGroup(id: number, data: UpdateItemGroupData): Promise<ItemGroup> {
  return apiRequest<ItemGroup>('PATCH', `/api/item-groups/${id}`, data);
}

export async function deleteItemGroup(id: number): Promise<void> {
  return apiRequest<void>('DELETE', `/api/item-groups/${id}`);
}
