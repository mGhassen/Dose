import { apiRequest } from '../queryClient';

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

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiRequest('POST', '/api/auth/login', credentials);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    return apiRequest('POST', '/api/auth/register', data);
  },

  async getSession(): Promise<SessionData> {
    try {
      return await apiRequest('GET', '/api/auth/session');
    } catch (error) {
      const status = (error as any)?.status;
      if (
        status === 501 &&
        typeof window !== 'undefined' &&
        process.env.NODE_ENV === 'development' &&
        (window as any).__MSW_ENABLED__
      ) {
        try {
          const ready = (window as any).__MSW_READY__ as Promise<any> | undefined;
          if (ready && typeof ready.then === 'function') {
            await Promise.race([
              ready,
              new Promise((resolve) => setTimeout(resolve, 1200)),
            ]);
          }
          return await apiRequest('GET', '/api/auth/session');
        } catch {}
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    return apiRequest('POST', '/api/auth/logout');
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest('POST', '/api/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiRequest('POST', '/api/auth/reset-password', { token, password });
  },

  async acceptInvitation(token: string, password: string): Promise<{ message: string }> {
    return apiRequest('POST', '/api/auth/accept-invitation', { token, password });
  },

  async checkAccountStatus(email: string): Promise<{ success: boolean; status?: string; authStatus?: string; message?: string; error?: string }> {
    return apiRequest('POST', '/api/auth/check-status', { email });
  },

  async getMemberSession(): Promise<SessionData> {
    try {
      return await apiRequest('GET', '/api/auth/session');
    } catch (error) {
      const status = (error as any)?.status;
      if (
        status === 501 &&
        typeof window !== 'undefined' &&
        process.env.NODE_ENV === 'development' &&
        (window as any).__MSW_ENABLED__
      ) {
        try {
          const ready = (window as any).__MSW_READY__ as Promise<any> | undefined;
          if (ready && typeof ready.then === 'function') {
            await Promise.race([
              ready,
              new Promise((resolve) => setTimeout(resolve, 1200)),
            ]);
          }
          return await apiRequest('GET', '/api/auth/session');
        } catch {}
      }
      throw error;
    }
  }
};
