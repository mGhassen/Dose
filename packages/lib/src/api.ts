// Extend the Window interface to include our custom property
declare global {
  interface Window {
    __authToken?: string;
  }
}

import { safeLocalStorage } from './localStorage';

// Helper to get the auth token
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.__authToken || safeLocalStorage.getItem('access_token');
}

// Helper to set the auth token
export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  
  if (token) {
    window.__authToken = token;
    safeLocalStorage.setItem('access_token', token);
  } else {
    delete window.__authToken;
    safeLocalStorage.removeItem('access_token');
  }
}

// API client with auth headers
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Ensure the URL starts with a slash and has the /api prefix
  const apiUrl = url.startsWith('/') ? url : `/${url}`;
  const fullUrl = apiUrl.startsWith('/api') ? apiUrl : `/api${apiUrl}`;
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies if using them
    });
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      // For auth endpoints, don't clear tokens here - let the auth hook handle refresh
      // Only clear tokens for non-auth endpoints
      const isAuthEndpoint = url.includes('/api/auth/');
      
      if (!isAuthEndpoint) {
        // For non-auth endpoints, clear token and redirect
        setAuthToken(null);
        const returnUrl = window.location.pathname + window.location.search;
        window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnUrl)}`;
        throw new Error('Session expired. Please log in again.');
      } else {
        // For auth endpoints, just throw the error - let the auth hook handle it
        // This allows the session route to return needsRefresh and trigger refresh
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || 'Authentication failed');
        (error as any).status = 401;
        (error as any).needsRefresh = errorData.needsRefresh;
        throw error;
      }
    }
    
    // Handle other error statuses
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      
      const errorMessage =
        (typeof errorData === 'string' ? errorData : undefined) ||
        errorData?.message ||
        errorData?.error ||
        response.statusText ||
        'Request failed';
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = errorData;
      // Pass through all error data properties
      if (errorData && typeof errorData === 'object') {
        Object.keys(errorData).forEach(key => {
          (error as any)[key] = errorData[key];
        });
      }
      throw error;
    }
    
    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null as unknown as T;
    }
    
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Auth API methods
export const authApi = {
  async login(credentials: { email: string; password: string }) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error || 'Login failed');
      (error as any).status = response.status;
      throw error;
    }
    
    if (data.success && data.session?.access_token) {
      safeLocalStorage.setItem('access_token', data.session.access_token);
      if (data.session.refresh_token) {
        safeLocalStorage.setItem('refresh_token', data.session.refresh_token);
      }
      window.__authToken = data.session.access_token;
    }
    
    return data;
  },
  
  async getSession() {
    // Get the stored token
    const token = getAuthToken();
    if (!token) return null;
    
    try {
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      // If MSW/worker wasn't ready, 501 may be returned. Retry a few times with short backoff.
      if (
        response.status === 501
      ) {
        for (let attempt = 0; attempt < 3; attempt++) {
          // Wait for MSW ready if available in dev
          try {
            if (
              typeof window !== 'undefined' &&
              process.env.NODE_ENV === 'development'
            ) {
              const ready = (window as any).__MSW_READY__ as Promise<any> | undefined;
              if (ready && typeof ready.then === 'function') {
                await Promise.race([
                  ready,
                  new Promise((resolve) => setTimeout(resolve, 800 + attempt * 400)),
                ]);
              }
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 200 + attempt * 300));
          const retryResp = await fetch('/api/auth/session', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          if (retryResp.ok) {
            return await retryResp.json();
          }
          if (retryResp.status !== 501) {
            // Break out to normal error flow for other statuses
            if (!retryResp.ok) throw new Error(`Failed to get session: ${retryResp.statusText}`);
          }
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh the token if we get a 401
          await authApi.refreshToken();
          const newToken = getAuthToken();
          if (!newToken) throw new Error('Failed to refresh token');
          
          // Retry with new token
          const retryResponse = await fetch('/api/auth/session', {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (!retryResponse.ok) {
            throw new Error('Failed to get session after refresh');
          }
          
          return await retryResponse.json();
        }
        throw new Error(`Failed to get session: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Session check failed:', error);
      // Clear invalid token
      setAuthToken(null);
      throw error;
    }
  },
  
  async refreshToken() {
    const refreshToken = safeLocalStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      
      if (data.access_token) {
        setAuthToken(data.access_token);
        safeLocalStorage.setItem('access_token', data.access_token);
        
        // Update refresh token if a new one was provided
        if (data.refresh_token) {
          safeLocalStorage.setItem('refresh_token', data.refresh_token);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens on refresh failure
      setAuthToken(null);
      safeLocalStorage.removeItem('refresh_token');
      throw error;
    }
  },
  
  async logout() {
    try {
      // Call server-side logout with credentials
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include', // Important for session cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth state
      setAuthToken(null);
      safeLocalStorage.removeItem('access_token');
      safeLocalStorage.removeItem('refresh_token');
      
      // Force a full page reload to clear any in-memory state
      window.location.href = '/auth/login';
    }
  },
};
