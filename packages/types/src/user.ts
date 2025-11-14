// User types - unified across mobile and web

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
  updatedAt: string | null;
  isDeletable: boolean;
}

export interface CreateUserData {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  password?: string;
  roleId: number;
}

export interface UpdateUserData {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  department?: string;
  comment?: string;
  isActive?: boolean;
  roleId?: number;
}

