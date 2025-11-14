import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "./api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = `${res.status}: ${res.statusText}`;
    let errorData: any = {};
    
    try {
      const text = await res.text();
      
      // Check if response is JSON
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          errorData = JSON.parse(text);
          message = errorData.error || errorData.message || message;
        } catch {
          // JSON parsing failed, use original message
        }
      } else if (text.includes('<!DOCTYPE')) {
        // HTML error page returned
        message = `Server error: ${res.status} ${res.statusText}`;
      } else if (text.length > 0 && text.length < 200) {
        message = text;
      }
    } catch {
      // If text parsing failed, use the status message
    }

    // Don't throw error for redirect responses (403 with redirectTo)
    if (res.status === 403 && errorData.redirectTo) {
      // Return the response data instead of throwing
      return { shouldThrow: false, data: errorData };
    }

    const error = new Error(message);
    // Preserve all error data properties
    Object.keys(errorData).forEach(key => {
      (error as any)[key] = errorData[key];
    });
    (error as any).status = res.status;
    (error as any).data = errorData;
    
    throw error;
  }
  
  return { shouldThrow: false };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  // Get token using the shared utility
  const token = getAuthToken();

  const headers: Record<string, string> = data
    ? { "Content-Type": "application/json" }
    : {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  const throwResult = await throwIfResNotOk(res);
  
  // If throwIfResNotOk returned data instead of throwing, return that data
  if (throwResult && !throwResult.shouldThrow && throwResult.data) {
    return throwResult.data;
  }
  
  // Parse JSON response
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Note: QueryClient instances are created in providers.tsx
// This file only exports utility functions (getQueryFn, apiRequest)
