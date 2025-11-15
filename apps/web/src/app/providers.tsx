"use client";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryFn } from "@kit/lib/queryClient";
import { MSWProvider } from "@/components/msw-provider";
import { UserSettingsProvider } from "@/components/user-settings-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { YearProvider } from "@/contexts/year-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryFn: getQueryFn({ on401: "throw" }),
            refetchInterval: false,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime) - keeps data in cache even when unused
            retry: (failureCount, error) => {
              // Don't retry on abort errors (query cancellation)
              if (error instanceof Error && error.name === 'AbortError') {
                return false;
              }
              // Retry up to 3 times for network errors
              if (failureCount < 3 && error instanceof Error && error.message.includes('fetch')) {
                return true;
              }
              return false;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <MSWProvider>
      <QueryClientProvider client={queryClient}>
        <UserSettingsProvider>
          <ThemeProvider>
            <YearProvider>
              {children}
            </YearProvider>
          </ThemeProvider>
        </UserSettingsProvider>
      </QueryClientProvider>
    </MSWProvider>
  );
}
