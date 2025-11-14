// Shared utility functions

export function normalizeEndpoint(endpoint: string): string {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

export function buildUrl(baseUrl: string, endpoint: string): string {
  const normalized = normalizeEndpoint(endpoint);
  return baseUrl.endsWith('/')
    ? `${baseUrl}${normalized.slice(1)}`
    : `${baseUrl}${normalized}`;
}

