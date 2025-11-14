import { QueryClient } from "@tanstack/react-query";

/**
 * Get auth token from cookies (server-side)
 * Uses dynamic import to avoid evaluating next/headers at module level
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // Dynamic import to avoid evaluating next/headers at module load time
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    return token || null;
  } catch {
    // Cookies might not be available in all contexts
    return null;
  }
}

/**
 * Create a QueryClient for server-side prefetching
 * Uses same config as client-side for consistency
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - same as client
        gcTime: 10 * 60 * 1000, // 10 minutes - same as client
      },
    },
  });
}

/**
 * Server-side fetch for API requests
 * This calls Next.js API routes internally, which will handle MSW/proxy
 */
export async function serverFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure the URL starts with /api - this will call Next.js API routes
  const apiUrl = url.startsWith('/api') ? url : `/api${url}`;
  
  // On server, we need to use absolute URL or localhost
  // Since we're in the same Next.js app, we can construct the URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const fullUrl = `${baseUrl}${apiUrl}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      cache: 'no-store', // Always fetch fresh on server
    });

    if (!response.ok) {
      // Log warning but still throw - let React Query handle the error state
      console.warn(`[ServerFetch] ${response.status} for ${fullUrl}`);
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null as unknown as T;
    }

    return response.json();
  } catch (error) {
    // Log the error for debugging
    console.error(`[ServerFetch] Error fetching ${fullUrl}:`, error);
    // Re-throw so React Query knows the prefetch failed
    // The client will retry on mount
    throw error;
  }
}

