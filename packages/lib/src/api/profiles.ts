import { apiRequest, apiBlobRequest } from './api';

export interface Profile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  department: string;
  position: string;
  employeeId: string;
  hireDate: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
    status: 'active' | 'expired' | 'pending';
  }>;
  skills: string[];
  languages: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileRequest {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  bio?: string;
  department: string;
  position: string;
  employeeId: string;
  hireDate: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
    status: 'active' | 'expired' | 'pending';
  }>;
  skills?: string[];
  languages?: string[];
}

export interface UpdateProfileRequest extends Partial<CreateProfileRequest> {
  id: number;
}

export interface ProfilesResponse {
  data: Profile[];
  total: number;
  page: number;
  limit: number;
}

export interface Certification {
  id: number;
  profileId: number;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface ProfileStatistics {
  totalCertifications: number;
  activeCertifications: number;
  expiredCertifications: number;
  skillsCount: number;
  languagesCount: number;
  lastUpdated: string;
}

export const profilesApi = {
  // Get all profiles with pagination and filtering
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    position?: string;
    isActive?: boolean;
  }): Promise<ProfilesResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.department) searchParams.append('department', params.department);
    if (params?.position) searchParams.append('position', params.position);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    return apiRequest<ProfilesResponse>('GET', `/api/profiles?${searchParams.toString()}`);
  },

  // Get profile by ID
  getById: async (id: number): Promise<Profile> => {
    return apiRequest<Profile>('GET', `/api/profiles/${id}`);
  },

  // Get profile by user ID
  getByUserId: async (userId: number): Promise<Profile> => {
    return apiRequest<Profile>('GET', `/api/profiles/user/${userId}`);
  },

  // Create new profile
  create: async (data: CreateProfileRequest): Promise<Profile> => {
    const id = await apiRequest<number>('POST', '/api/profiles', data);
    return apiRequest<Profile>('GET', `/api/profiles/${id}`);
  },

  // Update profile
  update: async (id: number, data: Partial<CreateProfileRequest>): Promise<Profile> => {
    await apiRequest<void>('PUT', `/api/profiles/${id}`, { id, ...data });
    return apiRequest<Profile>('GET', `/api/profiles/${id}`);
  },

  // Delete profile
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>('DELETE', `/api/profiles/${id}`);
  },

  // Bulk delete profiles
  bulkDelete: async (ids: number[]): Promise<void> => {
    return apiRequest<void>('DELETE', '/api/profiles/bulk', { ids });
  },

  // Export profiles
  export: async (format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
    return apiBlobRequest('GET', `/api/profiles/export?format=${format}`);
  },

  // Upload avatar
  uploadAvatar: async (id: number, file: File): Promise<{ avatar: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return apiRequest<{ avatar: string }>('POST', `/api/profiles/${id}/avatar`, formData);
  },

  // Add certification
  addCertification: async (id: number, certification: {
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
    status: 'active' | 'expired' | 'pending';
  }): Promise<Certification> => {
    return apiRequest<Certification>('POST', `/api/profiles/${id}/certifications`, certification);
  },

  // Update certification
  updateCertification: async (id: number, certificationId: number, certification: Partial<{
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
    status: 'active' | 'expired' | 'pending';
  }>): Promise<Certification> => {
    return apiRequest<Certification>('PUT', `/api/profiles/${id}/certifications/${certificationId}`, certification);
  },

  // Remove certification
  removeCertification: async (id: number, certificationId: number): Promise<void> => {
    return apiRequest<void>('DELETE', `/api/profiles/${id}/certifications/${certificationId}`);
  },

  // Get profile statistics
  getStatistics: async (id: number): Promise<{
    totalCertifications: number;
    activeCertifications: number;
    expiredCertifications: number;
    skillsCount: number;
    languagesCount: number;
  }> => {
    return apiRequest<ProfileStatistics>('GET', `/api/profiles/${id}/statistics`);
  },
};
