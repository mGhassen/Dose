import { apiRequest } from './api';
import type { Item, CreateItemData, UpdateItemData, PaginatedResponse, PaginationParams } from '@kit/types';

export interface ItemCatalogResponse {
  parentItem: { id: number; name: string; isCatalogParent: boolean } | null;
  variantMeta: { nameSnapshot: string | null; squareVariationId: string | null } | null;
  variations: Array<{
    id: number;
    variantItemId: number;
    name: string;
    sku: string | null;
    sortOrder: number | null;
    nameSnapshot: string | null;
    squareVariationId: string | null;
  }>;
  modifierLists: Array<{
    linkSortOrder: number | null;
    minSelected: number | null;
    maxSelected: number | null;
    enabled: boolean;
    id: number;
    name: string | null;
    selectionType: string | null;
    squareModifierListId: string | null;
    modifiers: Array<{
      id: number;
      name: string | null;
      priceAmountCents: number | null;
      sortOrder: number;
      squareModifierId: string | null;
      supplyItemId: number | null;
      supplyItemName: string | null;
      supplyItemAffectsStock: boolean;
    }>;
  }>;
  modifierListsSourceItemId: number;
  modifierListUsageByRecipe?: Record<
    number,
    Array<{ recipeId: number; recipeName: string; modifierCount: number }>
  >;
}

export const itemsApi = {
  getAll: (params?: PaginationParams & { includeRecipes?: boolean; producedOnly?: boolean; excludeCatalogParents?: boolean; itemType?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.includeRecipes) searchParams.append('includeRecipes', 'true');
    if (params?.producedOnly) searchParams.append('producedOnly', 'true');
    if (params?.excludeCatalogParents) searchParams.append('excludeCatalogParents', 'true');
    if (params?.itemType) searchParams.append('itemType', params.itemType);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Item>>('GET', `/api/items${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Item>('GET', `/api/items/${id}`),
  create: (data: CreateItemData) => apiRequest<Item>('POST', '/api/items', data),
  update: (id: string, data: UpdateItemData) => apiRequest<Item>('PUT', `/api/items/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/items/${id}`),
  getCatalog: (id: string) => apiRequest<ItemCatalogResponse>('GET', `/api/items/${id}/catalog`),
};

// Legacy alias for backward compatibility
export const ingredientsApi = itemsApi;
