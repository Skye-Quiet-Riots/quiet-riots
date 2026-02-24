import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https://images.unsplash.com https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com https://platform-lookaside.fbsbx.com https://graph.facebook.com",
    "media-src 'self' https://*.public.blob.vercel-storage.com",
    "font-src 'self'",
    "connect-src 'self' https://*.ingest.us.sentry.io https://*.ingest.sentry.io https://us.i.posthog.com https://us.posthog.com https://eu.i.posthog.com https://eu.posthog.com https://accounts.google.com https://www.facebook.com https://graph.facebook.com",
    "frame-src 'self' https://accounts.google.com https://www.facebook.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  csp: string,
  isHttps: boolean,
) {
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isHttps) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Pass nonce to the page via response headers (readable by server components)
  response.headers.set('x-nonce', nonce);
}

export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith('/api/');

  // CSRF protection for API mutation routes
  // Exempt: bot API (Bearer token auth), Auth.js routes (handles its own CSRF), GET requests
  if (
    isApi &&
    request.method !== 'GET' &&
    !path.startsWith('/api/bot') &&
    !path.startsWith('/api/auth/')
  ) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    let originValid = false;

    const allowedOrigins = new Set(['https://www.quietriots.com', 'https://quietriots.com']);
    if (isDev) {
      allowedOrigins.add('http://localhost:3000');
      allowedOrigins.add('http://127.0.0.1:3000');
    }

    if (origin) {
      originValid = allowedOrigins.has(origin);
    } else if (referer) {
      try {
        originValid = allowedOrigins.has(new URL(referer).origin);
      } catch {
        originValid = false;
      }
    }

    if (!originValid) {
      return new NextResponse(
        JSON.stringify({ error: 'CSRF validation failed', code: 'CSRF_ERROR' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  }

  // For API routes: skip i18n, just apply security headers + cache
  if (isApi) {
    const csp = buildCsp(nonce, isDev);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    applySecurityHeaders(response, nonce, csp, request.nextUrl.protocol === 'https:');

    // Cache headers for GET API routes (excluding user-specific /me)
    if (request.method === 'GET' && !path.includes('/me')) {
      response.headers.set(
        'Cache-Control',
        'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      );
    }

    return response;
  }

  // For page routes: apply i18n routing, then add security headers
  const response = handleI18nRouting(request);

  const csp = buildCsp(nonce, isDev);
  applySecurityHeaders(response, nonce, csp, request.nextUrl.protocol === 'https:');

  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|og-image.jpg|logo-192.png|logo-512.png|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
