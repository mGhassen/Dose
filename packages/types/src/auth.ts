// Authentication types

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  session?: {
    access_token: string;
    refresh_token?: string;
  };
  user?: any;
  redirectTo?: string;
  status?: string;
  authStatus?: string;
  message?: string;
  userId?: string;
}

export interface SessionData {
  user: any;
  session: any;
}

