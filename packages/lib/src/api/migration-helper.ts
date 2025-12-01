import { NextRequest, NextResponse } from 'next/server';
import { shouldUseAPI, FunctionalityName } from '../config';
import { proxyToBackend } from './proxy';

/**
 * Helper function for API routes to handle migration between MSW and real API
 * 
 * If the functionality is configured to use API, it proxies to the backend.
 * Otherwise, it returns null/undefined which allows MSW to handle the request
 * if MSW handlers are registered for that functionality.
 * 
 * Note: When MSW is enabled and handlers are registered for a functionality,
 * MSW will intercept the request before it reaches this API route.
 * When MSW handlers are NOT registered (because config says use API), 
 * the request will reach here and be proxied to the backend.
 * 
 * @param functionality - The functionality name (API endpoint name)
 * @param path - The API path (e.g., '/api/events')
 * @param request - The Next.js request object
 * @returns NextResponse
 */
export async function handleMigrationRequest(
  functionality: FunctionalityName,
  path: string,
  request: NextRequest
): Promise<NextResponse> {
  const shouldUse = shouldUseAPI(functionality);
  const envVar = process.env[`MIGRATION_USE_API_${functionality.toUpperCase()}`];
  
  
  
  if (shouldUse) {
    // Use real API - proxy to backend
    // This means MSW handlers for this functionality are NOT registered
    
    return proxyToBackend(path, request);
  } else {
    // Should use MSW
    // If MSW handlers are registered, MSW intercepts BEFORE reaching here
    // If we reach here, it means:
    // 1. MSW handlers are NOT registered (shouldn't happen if MSW is properly configured)
    // 2. MSW is not enabled
    // 3. There's a configuration issue
    
    const mswEnabled = process.env.NEXT_PUBLIC_ENABLE_MSW !== 'false';
    
    // If MSW is not enabled, fall back to real API instead of erroring
    if (!mswEnabled) {
      return proxyToBackend(path, request);
    }
    
    console.error(`[Migration] ${functionality} → Should use MSW but reached API route. MSW enabled: ${mswEnabled}`);
    console.error(`[Migration] If you see this, MSW handlers for ${functionality} are NOT registered. Check:`);
    console.error(`[Migration] 1. Did you restart the dev server after changing env vars?`);
    console.error(`[Migration] 2. Is NEXT_PUBLIC_MIGRATION_USE_API_${functionality.toUpperCase()} set correctly?`);
    console.error(`[Migration] 3. Check browser console for MSW handler registration logs`);
    
    // Return error - MSW should handle this but didn't
    // This makes the configuration issue immediately visible
    return NextResponse.json(
      { 
        error: `MSW should handle ${functionality} but handlers are not registered. Check browser console and MSW configuration. Did you restart the dev server?`,
        path,
        functionality,
        mswEnabled
      },
      { status: 503 }
    );
  }
}

