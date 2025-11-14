"use client";

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
// import { useLocale } from 'next-intl';
import { authApi, RegisterData, LoginCredentials, AuthResponse } from '@smartlogbook/lib/api/auth';
import { safeLocalStorage } from '@smartlogbook/lib/localStorage';

export interface User {
  id: string;
  account_id: string;
  email: string; // Account email for authentication
  profileEmail?: string; // Contact email, separate from account email
  firstName?: string;
  lastName?: string;
  phone?: string;
  age?: number;
  profession?: string;
  address?: string;
  isAdmin: boolean;
  isMember: boolean;
  status?: string;
  role?: 'admin' | 'member';
  credit?: number;
  userType?: string;
  accessiblePortals?: string[];
  member_id?: string;
  trainer_id?: string;
  provider?: string; // Authentication provider (e.g., 'google', 'email')
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  loginError: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  authError: string | null;
  // Additional auth operations
  register: (data: RegisterData) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  acceptInvitation: (token: string, password: string) => Promise<void>;
  checkAccountStatus: (email: string) => Promise<any>;
  resendConfirmation: (email: string) => Promise<void>;
  // Google OAuth
  loginWithGoogle: () => Promise<void>;
  completeGoogleRegistration: (googleData: any) => Promise<void>;
  // Profile management
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<Error | null>(null);
  const [authError, setAuthError] = useState<string | null>(null); // NEW
  const [authCheckComplete, setAuthCheckComplete] = useState(false); // NEW: Prevent multiple auth checks
  const router = useRouter();
  const queryClient = useQueryClient();
  // const locale = useLocale();

  // Helper function to clear all query cache
  const clearQueryCache = React.useCallback(() => {
    
    queryClient.clear();
  }, [queryClient]);

  // Debug user state changes and clear cache when user changes
  useEffect(() => {
    
    
    // Clear cache when user becomes null (logout) to prevent data leakage
    if (!user) {
      clearQueryCache();
    }
  }, [user, isLoading]);

  // Fetch user session
  const fetchSession = async (token: string) => {
    
    try {
      
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      

      if (!response.ok) {
        // If MSW wasn't ready yet, wait and retry once in dev
        if (
          response.status === 501 &&
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
            const retry = await fetch('/api/auth/session', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              credentials: 'include',
            });
            if (retry.ok) {
              const data = await retry.json();
              
              if (data.success && data.user) {
                setUser(data.user);
                setAuthError(null);
                return data.user;
              }
            }
          } catch {}
        }
        const errorData = await response.json().catch(() => ({}));
        
        
        // Handle specific status codes
        if (response.status === 403) {
          // User is pending, suspended, or other restricted status
          if (errorData.status === 'pending') {
            // Redirect to waiting approval page
            router.push('/auth/waiting-approval');
            setAuthError(errorData.error || 'Account pending approval');
            return null;
          }
          setAuthError(errorData.error || 'Account access denied');
          return null;
        }
        
        if (response.status === 401) {
          
          // Clear invalid token
          safeLocalStorage.removeItem('access_token');
          safeLocalStorage.removeItem('refresh_token');
          if (typeof window !== 'undefined') {
            delete window.__authToken;
          }
          setUser(null);
          router.push('/auth/login');
          setAuthError('Your session has expired or is invalid. Please log in again.');
          return null;
        }
        
        setAuthError(errorData.error || 'Failed to fetch session');
        return null;
      }

      const data = await response.json();
      
      
      if (data.success && data.user) {
        
        setUser(data.user);
        setAuthError(null); // Clear any previous errors
        return data.user;
      }
      
      // Only clear tokens if we got a specific error response, not just missing data
      if (data.error || data.message) {
        
        safeLocalStorage.removeItem('access_token');
        safeLocalStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') {
          delete window.__authToken;
        }
      }
      setUser(null);
      return null;
    } catch (error) {
      console.error('Session fetch error:', error);
      
      // Handle abort error (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        
        setAuthError('Session check timed out. Please try again.');
      } else {
        setAuthError(
          error instanceof Error && error.message.includes('expired')
            ? 'Your session has expired. Please log in again.'
            : 'An unexpected authentication error occurred. Please try again.'
        );
      }
      return null;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      
      
      // In development, wait briefly for MSW to be ready so it can intercept auth
      try {
        if (
          typeof window !== 'undefined' &&
          process.env.NODE_ENV === 'development' &&
          (window as any).__MSW_ENABLED__
        ) {
          const ready = (window as any).__MSW_READY__ as Promise<any> | undefined;
          if (ready && typeof ready.then === 'function') {
            await Promise.race([
              ready,
              new Promise((resolve) => setTimeout(resolve, 1200)),
            ]);
          }
        }
      } catch {}

      // Prevent multiple simultaneous auth checks
      if (authCheckComplete) {
        
        return;
      }
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        
        setIsLoading(false);
        setAuthCheckComplete(true);
      }, 3000);

      try {
        // Check for Google OAuth callback parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const googleAuth = urlParams.get('google_auth');
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const userId = urlParams.get('user_id');

        // Google OAuth is now handled server-side in the callback route
        // No need to handle it here anymore

        // Regular session check
        const token = safeLocalStorage.getItem('access_token');
        
        if (!token) {
          
          clearTimeout(timeoutId);
          setIsLoading(false);
          setAuthCheckComplete(true);
          return;
        }

        // Ensure window token is synchronized
        if (typeof window !== 'undefined' && !window.__authToken) {
          window.__authToken = token;
        }

        
        const user = await fetchSession(token);
        
        if (!user) {
          // Session was invalid, tokens already cleared in fetchSession
          
          setUser(null);
        } else {
          
        }
      } catch (error) {
        console.error('Session check failed:', error);
        // Only clear tokens for authentication-specific errors, not network errors
        if (error instanceof Error && (
          error.message.includes('401') || 
          error.message.includes('403') || 
          error.message.includes('expired') ||
          error.message.includes('invalid')
        )) {
          safeLocalStorage.removeItem('access_token');
          safeLocalStorage.removeItem('refresh_token');
          if (typeof window !== 'undefined') {
            delete window.__authToken;
          }
          setUser(null);
          setAuthError('Session expired. Please log in again.');
        } else {
          // For network errors, just set error but don't clear tokens
          setAuthError('Network error. Please check your connection.');
        }
      } finally {
        clearTimeout(timeoutId);
        
        setIsLoading(false);
        setAuthCheckComplete(true);
      }
    };

    checkAuth();

    // Listen for authentication state changes (e.g., from OAuth success)
    const handleAuthStateChange = () => {
      
      checkAuth();
    };

    // Also listen for page visibility changes to catch OAuth redirects
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        
        checkAuth();
      }
    };

    window.addEventListener('auth-state-changed', handleAuthStateChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Only run once on mount

  // Handle redirection when user changes (only on initial load)
  useEffect(() => {
    if (user && !isLoading) {
      const currentPath = window.location.pathname;
      
      // Only redirect if we're on the root page or login page
      if (currentPath === '/' || currentPath === '/auth/login') {
        // Check accessible portals to determine where to redirect
        if (user.accessiblePortals?.includes('admin')) {
          router.push('/dashboard');
        } else if (user.accessiblePortals?.includes('manager')) {
          router.push('/dashboard'); // Managers go to dashboard with manager layout
        } else if (user.accessiblePortals?.includes('conductor')) {
          router.push('/dashboard'); // Conductors go to dashboard with user layout
        } else {
          router.push('/auth/waiting-approval');
        }
      }
    }
  }, [user, isLoading, router]);

  // Refresh the current session
  const refreshSession = async () => {
    const token = safeLocalStorage.getItem('access_token');
    if (!token) return null;
    return fetchSession(token);
  };

  const login = async (email: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      // 1. Login request
      const data = await authApi.login({ email, password });
      
      
      
      if (!data.success) {
        // Handle specific error cases
        if (data.error === 'Email not confirmed' && data.redirectTo) {
          // Email not confirmed - redirect to account status page
          safeLocalStorage.setItem('account_status_email', email);
          router.push(data.redirectTo);
          return;
        }
        if (data.error && data.error.toLowerCase().includes('pending')) {
          // User is pending (pending admin approval)
          safeLocalStorage.setItem('account_status_email', email);
          router.push(`/auth/account-status?email=${encodeURIComponent(email)}`);
          return;
        }
        if (data.error && data.error.toLowerCase().includes('suspended')) {
          // User is suspended
          safeLocalStorage.setItem('account_status_email', email);
          router.push(`/auth/account-status?email=${encodeURIComponent(email)}`);
          return;
        }
        setLoginError(new Error(data.error || 'Account access denied'));
        return;
      }

      if (!data.session || !data.session.access_token) {
        
        const error = new Error('No access token received');
        setLoginError(error);
        return;
      }

      // 2. Store tokens
      console.log('Storing tokens:', {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      const accessTokenStored = safeLocalStorage.setItem('access_token', data.session.access_token);
      
      if (data.session.refresh_token) {
        const refreshTokenStored = safeLocalStorage.setItem('refresh_token', data.session.refresh_token);
        
      }
      if (typeof window !== 'undefined') {
        window.__authToken = data.session.access_token;
        
      }
      
      // Verify tokens are stored
      const storedAccessToken = safeLocalStorage.getItem('access_token');
      const storedRefreshToken = safeLocalStorage.getItem('refresh_token');
      

      // Clean up any pending email
      safeLocalStorage.removeItem('pending_email');
      safeLocalStorage.removeItem('pending_approval_email');
      safeLocalStorage.removeItem('account_status_email');

      // 3. Clear query cache to prevent data leakage from previous user
      clearQueryCache();
      
      // 4. Set user data from response
      if (!data.user) {
        const error = new Error('Failed to load user profile');
        setLoginError(error);
        return;
      }
      setUser(data.user);
      setLoginError(null); // Clear any previous errors
      setAuthCheckComplete(true); // Mark auth check as complete
    } catch (error) {
      console.error('Login error:', error);
      
      // Check if this is an error with redirect information (from apiRequest)
      if (error instanceof Error && (error as any).data) {
        const errorData = (error as any).data;
        
        
        // Handle email confirmation redirect
        if (errorData.error === 'Email not confirmed' && errorData.redirectTo) {
          safeLocalStorage.setItem('account_status_email', email);
          router.push(errorData.redirectTo);
          return; // Don't throw error, just redirect
        }
        
        // Handle other redirect cases
        if (errorData.error && errorData.error.toLowerCase().includes('pending')) {
          safeLocalStorage.setItem('account_status_email', email);
          router.push(`/auth/account-status?email=${encodeURIComponent(email)}`);
          return; // Don't throw error, just redirect
        }
        
        if (errorData.error && errorData.error.toLowerCase().includes('suspended')) {
          safeLocalStorage.setItem('account_status_email', email);
          router.push(`/auth/account-status?email=${encodeURIComponent(email)}`);
          return; // Don't throw error, just redirect
        }
      }
      
      safeLocalStorage.removeItem('access_token');
      safeLocalStorage.removeItem('refresh_token');
      if (typeof window !== 'undefined') {
        delete window.__authToken;
      }
      setUser(null);
      const loginError = error instanceof Error ? error : new Error(String(error));
      setLoginError(loginError);
      throw loginError; // Re-throw the error so the calling code can catch it
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      const token = safeLocalStorage.getItem('access_token');
      if (token) {
        await fetch('/api/auth/logout', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth-related data regardless of API call success
      safeLocalStorage.removeItem('access_token');
      safeLocalStorage.removeItem('refresh_token');
      safeLocalStorage.removeItem('pending_email');
      safeLocalStorage.removeItem('pending_approval_email');
      safeLocalStorage.removeItem('account_status_email');
      if (typeof window !== 'undefined') {
        delete window.__authToken;
      }
      
      // Clear query cache to prevent data leakage between users
      clearQueryCache();
      
      // Clear user state and errors immediately
      setUser(null);
      setLoginError(null);
      setAuthError(null);
      setAuthCheckComplete(false); // Reset auth check flag
      
      // Redirect to login page
      router.push('/auth/login');
    }
  };

  const value: AuthState = {
    user: user ? { 
      ...user, 
      role: user.isAdmin ? 'admin' : 'member' 
    } as User & { role: 'admin' | 'member' } : null,
    isLoading,
    isAuthenticated: !!user,
    isLoggingIn,
    loginError,
    login,
    logout,
    refreshSession,
    authError, // <-- Added
    // Additional auth operations
    register: async (data: RegisterData) => {
      try {
        const response = await authApi.register(data);
        
        // If registration was successful and includes session data, set the user
        if (response.success && response.session && response.user) {
          // Create a mock session object for the auth state
          const mockSession = {
            access_token: response.session.access_token,
            refresh_token: response.session.refresh_token,
            user: response.user
          };
          
          // Set the user in the auth state
          setUser(response.user);
          
          // Store session in localStorage for persistence
          if (typeof window !== 'undefined') {
            safeLocalStorage.setItem('access_token', response.session.access_token);
            if (response.session.refresh_token) {
              safeLocalStorage.setItem('refresh_token', response.session.refresh_token);
            }
            safeLocalStorage.setItem('auth_session', JSON.stringify(mockSession));
          }
        }
        
        return response;
      } catch (error: any) {
        throw new Error(error.message || 'Registration failed');
      }
    },
    forgotPassword: async (email: string) => {
      try {
        await authApi.forgotPassword(email);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to send reset email');
      }
    },
    resetPassword: async (token: string, password: string) => {
      try {
        await authApi.resetPassword(token, password);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to reset password');
      }
    },
    acceptInvitation: async (token: string, password: string) => {
      try {
        await authApi.acceptInvitation(token, password);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to accept invitation');
      }
    },
    checkAccountStatus: async (email: string) => {
      try {
        return await authApi.checkAccountStatus(email);
      } catch (error: any) {
        throw new Error(error.message || 'Failed to check account status');
      }
    },
    resendConfirmation: async (email: string) => {
      try {
        // This might need to be added to the auth API
        const response = await fetch('/api/auth/resend-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (!response.ok) {
          throw new Error('Failed to resend confirmation');
        }
      } catch (error: any) {
        throw new Error(error.message || 'Failed to resend confirmation');
      }
    },
    loginWithGoogle: async () => {
      try {
        setIsLoggingIn(true);
        setLoginError(null);
        
        // Mock Google OAuth flow
        const redirectUrl = `${window.location.origin}/auth/callback`;
        
        // Mock: Redirect to callback with mock Google auth
        const googleAuthUrl = `${redirectUrl}?code=mock_google_code&state=mock_state`;
        
        window.location.href = googleAuthUrl;
      } catch (error: any) {
        console.error('Google login error:', error);
        setLoginError(new Error(error.message || 'Failed to initiate Google login'));
        throw error;
      } finally {
        setIsLoggingIn(false);
      }
    },
    completeGoogleRegistration: async (googleData: any) => {
      try {
        setIsLoggingIn(true);
        setLoginError(null);
        
        // Store tokens
        safeLocalStorage.setItem('access_token', googleData.access_token);
        if (googleData.refresh_token) {
          safeLocalStorage.setItem('refresh_token', googleData.refresh_token);
        }
        if (typeof window !== 'undefined') {
          window.__authToken = googleData.access_token;
        }

        // Clear query cache to prevent data leakage from previous user
        clearQueryCache();
        
        // Fetch user session to complete the login
        const user = await fetchSession(googleData.access_token);
        if (user) {
          
          setUser(user);
        }
      } catch (error: any) {
        console.error('Google registration completion error:', error);
        setLoginError(new Error(error.message || 'Failed to complete Google registration'));
        throw error;
      } finally {
        setIsLoggingIn(false);
      }
    },
    updateProfile: async (data: Partial<User>) => {
      try {
        const token = safeLocalStorage.getItem('access_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/profile/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update profile');
        }

        const updatedUser = await response.json();
        
        // Update the user state with the new data
        if (updatedUser.user) {
          setUser(updatedUser.user);
        }
        
        return updatedUser;
      } catch (error: any) {
        console.error('Profile update error:', error);
        throw new Error(error.message || 'Failed to update profile');
      }
    },
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}