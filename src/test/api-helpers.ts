import { NextRequest } from 'next/server';

/**
 * Create a NextRequest for testing API routes
 */
export function createTestRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): NextRequest {
  const fullUrl = `http://localhost:3000${url}`;
  const headers = new Headers(options?.headers || {});
  if (options?.body) {
    headers.set('content-type', 'application/json');
  }
  return new NextRequest(fullUrl, {
    method: options?.method || 'GET',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Create a bot API request with Bearer token auth
 */
export function createBotRequest(
  action: string,
  params: Record<string, unknown> = {},
  apiKey: string = 'qr-bot-dev-key-2026',
): NextRequest {
  return createTestRequest('/api/bot', {
    method: 'POST',
    body: { action, params },
    headers: { authorization: `Bearer ${apiKey}` },
  });
}
