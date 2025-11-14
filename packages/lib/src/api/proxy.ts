import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Proxy a request from Next.js API route to backend
 * Used when MSW is disabled - route handlers proxy to real backend
 */
export async function proxyToBackend(path: string, request: NextRequest): Promise<NextResponse> {
  const queryString = request.nextUrl.search || '';
  // Normalize base and path to avoid double "/api" (e.g., BACKEND_URL ends with /api and path starts with /api)
  const base = (BACKEND_URL || '').replace(/\/$/, '');
  const normalizedPath = base.endsWith('/api') && path.startsWith('/api')
    ? path.replace(/^\/api/, '')
    : path;
  const url = `${base}${normalizedPath}${queryString}`;
  const method = request.method;
  
  // Headers will be set based on content type (FormData vs JSON)
  // For FormData, we create clean headers without Content-Type
  // For JSON, we use standard headers with Content-Type
  // Some endpoints (like POST actionreferences) return plain text, so check Accept header from request
  const acceptHeader = request.headers.get('accept') || 'application/json';
  const defaultHeaders: HeadersInit = {
    'Accept': acceptHeader,
  };

  // Forward auth headers and cookies if present (for both FormData and JSON)
  const authorization = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');
  if (authorization) {
    defaultHeaders['Authorization'] = authorization;
  }
  if (cookie) {
    defaultHeaders['Cookie'] = cookie;
  }

  const init: RequestInit = {
    method,
    headers: defaultHeaders,
  };

  if (method !== 'GET' && method !== 'DELETE') {
    const contentType = request.headers.get('content-type');
    
    // Check if it's FormData/multipart
    // When FormData is sent from browser, Content-Type includes 'multipart/form-data' with boundary
    if (contentType?.includes('multipart/form-data')) {
      // For FormData, forward the FormData directly
      const formData = await request.formData();
      init.body = formData;
      
      // CRITICAL: For FormData, don't set Content-Type in headers at all
      // Fetch API will automatically set it with the correct boundary when body is FormData
      // Copy default headers (with auth/cookies) but ensure no Content-Type
      const cleanHeaders: HeadersInit = { ...defaultHeaders };
      // Remove Content-Type if it somehow got in there
      delete cleanHeaders['Content-Type'];
      
      // Use clean headers without Content-Type
      init.headers = cleanHeaders;
    } else {
      // For JSON requests, always set Content-Type header
      // Even if incoming request doesn't have Content-Type, we set it for POST/PUT
      defaultHeaders['Content-Type'] = 'application/json';
      
      // Try to parse body as JSON
      try {
        const body = await request.json();
        init.body = JSON.stringify(body);
        init.headers = defaultHeaders;
      } catch {
        // If JSON parsing fails, body might be empty or malformed
        // Still set Content-Type header so backend knows we're sending JSON
        // Empty body might be valid for some endpoints
        init.headers = defaultHeaders;
        // Don't set body if parsing failed - let backend handle empty body
      }
    }
  }

  try {
    // Prevent self-proxy loops if BACKEND_URL points to this same Next server
    const requestOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    if (BACKEND_URL.replace(/\/?$/, '') === requestOrigin.replace(/\/?$/, '')) {
      console.error(`[Proxy] BACKEND_URL (${BACKEND_URL}) matches Next server origin (${requestOrigin}). Aborting to avoid loop.`);
      return NextResponse.json(
        { error: 'Proxy misconfiguration: BACKEND_URL points to this Next server. Set NEXT_PUBLIC_API_URL to your backend base URL.' },
        { status: 500 }
      );
    }

    const response = await fetch(url, init);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[Proxy] ${method} ${url} returned ${response.status}:`, errorText);
      return NextResponse.json(
        { error: errorText || `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return new NextResponse(null, { status: 204 });
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // Some endpoints return plain text (like POST returns just the ID)
      const text = await response.text();
      const num = parseInt(text);
      return NextResponse.json(isNaN(num) ? text : num);
    }
  } catch (error) {
    console.error(`Proxy error for ${method} ${path}:`, error);
    return NextResponse.json(
      { error: 'Failed to proxy request to backend' },
      { status: 500 }
    );
  }
}

