// Call API via Next.js rewrites (proxied to backend in next.config.ts)
// This avoids CORS issues
const API_BASE_URL = '';

import { getAuthToken } from '../api';

// Get auth token from cookies (server-side) or localStorage (client-side)
async function getAuthTokenForRequest(): Promise<string | null> {
  if (typeof window === 'undefined') {
    // Server-side: read from cookies using dynamic import
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      return cookieStore.get('access_token')?.value || null;
    } catch {
      return null;
    }
  }
  // Client-side: use existing function
  return getAuthToken();
}

// Deduplicate in-flight GET requests (helps with React StrictMode double-invoke in dev)
const inflightRequests = new Map<string, Promise<any>>();

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any,
  signal?: AbortSignal
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${API_BASE_URL}${normalizedEndpoint}`;
  
  // On server, we need absolute URLs for fetch
  const isServer = typeof window === 'undefined';
  if (isServer && url.startsWith('/')) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    url = `${baseUrl}${url}`;
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if token exists
  const token = await getAuthTokenForRequest();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    if (data instanceof FormData) {
      // Don't set Content-Type for FormData, let the browser set it
      delete (options.headers as any)['Content-Type'];
      options.body = data;
    } else {
      const bodyStr = JSON.stringify(data);
      if (method === 'PUT' && endpoint.includes('/events/')) {
        console.log('[apiRequest] PUT events body:', bodyStr);
      }
      options.body = bodyStr;
    }
  }
  const doFetch = async (): Promise<T> => {
    try {
      // If external signal is already aborted, throw immediately
      if (signal?.aborted) {
        const abortError = new DOMException('The operation was aborted.', 'AbortError');
        (abortError as any).isAbortError = true;
        throw abortError;
      }
      
      // Create a controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      
      // If external signal is provided, abort our controller when it aborts
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          controller.abort();
        });
      }
      
      const response = await fetch(url, { 
        ...options, 
        signal: controller.signal,
        ...(isServer && { cache: 'no-store' as RequestCache }), // Always fetch fresh on server
      });
      clearTimeout(timeout);
      
      // Check if response is HTML (likely a 404 page or error page)
      const contentType = response.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // If we got HTML instead of JSON, it's likely a routing issue
        if (isHtml && response.status === 404) {
          console.error(`[API Error] Got HTML 404 page instead of JSON. This usually means:`);
          console.error(`  1. The API route doesn't exist: ${endpoint}`);
          console.error(`  2. Next.js dev server needs to be restarted`);
          console.error(`  3. Port mismatch - server is on ${url.split('/')[2]}, but dev server might be on different port`);
          console.error(`  4. Route file has syntax errors preventing it from being registered`);
          
          const error = new Error(`API route not found: ${endpoint}. Got HTML 404 page. Check if the route exists and restart the dev server.`);
          (error as any).status = 404;
          (error as any).isHtml = true;
          (error as any).url = url;
          throw error;
        }
        
        console.error(`[API Error] ${method} ${endpoint} -> ${response.status} ${response.statusText}`);
        console.error(`[API Error] Response Body: ${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}`);
        console.error(`[API Error] Full URL: ${url}`);
        
        // Try to parse error details for better error messages
        let errorDetails: any = {};
        let errorMessage = `API request failed: ${method} ${endpoint} -> ${response.status} ${response.statusText}`;
        try {
          const parsedError = JSON.parse(errorText);
          if (parsedError.error) {
            // If error is a string, use it directly but include endpoint
            if (typeof parsedError.error === 'string') {
              errorMessage = `${parsedError.error} (${method} ${endpoint})`;
            } else {
              errorDetails = parsedError.error;
              errorMessage = parsedError.error.message || parsedError.error.error || errorMessage;
            }
          } else if (parsedError.message) {
            errorMessage = `${parsedError.message} (${method} ${endpoint})`;
          } else {
            errorDetails = parsedError;
          }
          
          // Include details if available
          if (parsedError.details) {
            errorDetails = { ...errorDetails, ...parsedError.details };
          }
        } catch {
          // If not JSON, use the raw text as error message but include endpoint
          if (errorText && errorText.length > 0) {
            const rawMessage = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
            errorMessage = `${rawMessage} (${method} ${endpoint})`;
            errorDetails = { message: errorText.substring(0, 200) };
          }
        }
        
        // For 404, provide more helpful context
        if (response.status === 404) {
          console.error(`[API] 404 Not Found for ${method} ${endpoint}`);
          console.error(`[API] This usually means:`);
          console.error(`  - The API route doesn't exist: ${endpoint}`);
          console.error(`  - The route file is missing or has a typo`);
          console.error(`  - Next.js dev server needs to be restarted`);
          console.error(`  - Route file has syntax errors preventing it from being registered`);
        }
        
        // For 403, provide more helpful context
        if (response.status === 403) {
          console.error(`[API] 403 Forbidden for ${method} ${endpoint}`);
          console.error(`[API] This usually means:`);
          console.error(`  - User lacks required permissions/role`);
          console.error(`  - Token is invalid or expired`);
          console.error(`  - Backend RLS policies blocking access`);
        }
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).data = errorDetails;
        throw error;
      }
      
      // Also check if we got HTML when we expected JSON (even if status is 200)
      if (isHtml) {
        console.error(`[API Warning] Got HTML response instead of JSON for ${endpoint}. This might indicate a routing issue.`);
      }

      // Handle empty responses (like DELETE)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      const result = await response.json();
      
      return result;
    } catch (error) {
      // Don't log AbortError as it's expected when queries are cancelled
      // This happens when React Query cancels queries (e.g., component unmount, query invalidation)
      if (error instanceof Error && (error.name === 'AbortError' || (error as any).isAbortError)) {
        // Create a proper AbortError that React Query can handle silently
        const abortError = new DOMException('The operation was aborted.', 'AbortError');
        (abortError as any).isAbortError = true;
        throw abortError;
      }
      console.error('API request error:', error);
      throw error;
    }
  };

  // Simple in-flight dedupe for GET without body
  const key = `${method}:${url}`;
  if (method === 'GET' && !data) {
    const existing = inflightRequests.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const promise = doFetch();
    inflightRequests.set(key, promise);
    try {
      return await promise;
    } finally {
      inflightRequests.delete(key);
    }
  }

  return doFetch();
}

export async function apiBlobRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<Blob> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${API_BASE_URL}${normalizedEndpoint}`;
  
  // On server, we need absolute URLs for fetch
  const isServer = typeof window === 'undefined';
  if (isServer && url.startsWith('/')) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    url = `${baseUrl}${url}`;
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if token exists
  const token = await getAuthTokenForRequest();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    if (data instanceof FormData) {
      // Don't set Content-Type for FormData, let the browser set it
      delete (options.headers as any)['Content-Type'];
      options.body = data;
    } else {
      options.body = JSON.stringify(data);
    }
  }

  try {
    const response = await fetch(url, options);
    
    
    
    if (!response.ok) {
      throw new Error(`API request failed: ${method} ${endpoint} -> ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    
    return blob;
  } catch (error) {
    console.error('API blob request error:', error);
    throw error;
  }
}
