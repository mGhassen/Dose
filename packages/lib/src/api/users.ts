import { apiRequest } from './api';

// Adjusted to match backend contract directly
export interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  department: string | null;
  comment: string | null;
  isActive: boolean;
  roleId: number;
  createdAt: string;
  updatedAt: string;
  isDeletable: boolean;
}

export interface CreateUserData {
  email: string;
  roleId: number;
}

export interface UpdateUserData {
  id: number;
  email?: string;
  roleId?: number;
}

export const usersApi = {
  async getUsers(): Promise<User[]> {
    // Backend sometimes returns 200 with empty body → treat as []
    const res = await apiRequest<User[] | undefined>('GET', '/api/users');
    return res ?? [];
  },

  async getUser(id: number): Promise<User> {
    return apiRequest<User>('GET', `/api/users/${id}`);
  },

  async createUser(data: CreateUserData): Promise<User> {
    const id = await apiRequest<number>('POST', '/api/users', data);
    return apiRequest<User>('GET', `/api/users/${id}`);
  },

  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    const payload = { ...data, id };
    await apiRequest<void>('PUT', `/api/users/${id}`, payload);
    return apiRequest<User>('GET', `/api/users/${id}`);
  },
 
  async deleteUser(id: number): Promise<void> {
    return apiRequest('DELETE', `/api/users/${id}`);
  }
};
