import { apiRequest, apiBlobRequest } from './api';

export interface Setting {
  id: number;
  key: string;
  value: string;
  description: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  options?: string[];
  isEditable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettingRequest {
  key: string;
  value: string;
  description: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  options?: string[];
  isEditable: boolean;
}

export interface UpdateSettingRequest extends Partial<CreateSettingRequest> {
  id: number;
}

export interface SettingsResponse {
  data: Setting[];
  total: number;
  page: number;
  limit: number;
}

export const settingsApi = {
  // Get all settings with pagination and filtering
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    type?: string;
    isEditable?: boolean;
  }): Promise<SettingsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.isEditable !== undefined) searchParams.append('isEditable', params.isEditable.toString());

    return apiRequest<SettingsResponse>('GET', `/api/settings?${searchParams.toString()}`);
  },

  // Get setting by ID
  getById: async (id: number): Promise<Setting> => {
    return apiRequest<Setting>('GET', `/api/settings/${id}`);
  },

  // Get setting by key
  getByKey: async (key: string): Promise<Setting> => {
    return apiRequest<Setting>('GET', `/api/settings/key/${key}`);
  },

  // Get settings by category
  getByCategory: async (category: string): Promise<Setting[]> => {
    return apiRequest<Setting[]>('GET', `/api/settings/category/${category}`);
  },

  // Create new setting
  create: async (data: CreateSettingRequest): Promise<Setting> => {
    const id = await apiRequest<number>('POST', '/api/settings', data);
    return apiRequest<Setting>('GET', `/api/settings/${id}`);
  },

  // Update setting
  update: async (id: number, data: Partial<CreateSettingRequest>): Promise<Setting> => {
    await apiRequest<void>('PUT', `/api/settings/${id}`, { id, ...data });
    return apiRequest<Setting>('GET', `/api/settings/${id}`);
  },

  // Update setting by key
  updateByKey: async (key: string, value: string): Promise<Setting> => {
    return apiRequest<Setting>('PUT', `/api/settings/key/${key}`, { value });
  },

  // Delete setting
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>('DELETE', `/api/settings/${id}`);
  },

  // Bulk delete settings
  bulkDelete: async (ids: number[]): Promise<void> => {
    return apiRequest<void>('DELETE', '/api/settings/bulk', { ids });
  },

  // Export settings
  export: async (format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
    return apiBlobRequest('GET', `/api/settings/export?format=${format}`);
  },

  // Import settings
  import: async (file: File): Promise<{ imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<{ message: string; imported: number; errors: string[] }>('POST', '/api/settings/import', formData);
  },

  // Reset settings to default
  resetToDefault: async (category?: string): Promise<Setting[]> => {
    return apiRequest<Setting[]>('POST', '/api/settings/reset', { category });
  },

  // Validate setting value
  validate: async (key: string, value: string): Promise<{ isValid: boolean; error?: string }> => {
    return apiRequest<{ isValid: boolean; error?: string }>('POST', '/api/settings/validate', { key, value });
  },
};
