import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware } from '@/lib/rate-limit';

// Allowed origins for CORS on API routes
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://alshaye.family',
];

/**
 * Production-hardened Next.js middleware.
 *
 * Responsibilities:
 * 1. Security headers on every response
 * 2. HTTPS redirect in production
 * 3. Rate limiting on API routes
 * 4. CORS handling on API routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api');
  const isProduction = process.env.NODE_ENV === 'production';

  // ── HTTPS redirect in production ────────────────────────────
  if (isProduction) {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto === 'http') {
      const httpsUrl = request.nextUrl.clone();
      httpsUrl.protocol = 'https';
      return NextResponse.redirect(httpsUrl, 301);
    }
  }

  // ── CORS preflight for API routes ──────────────────────────
  if (isApiRoute && request.method === 'OPTIONS') {
    const origin = request.headers.get('origin') || '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin);

    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowed ? origin : '',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // ── Rate limiting for API routes ───────────────────────────
  if (isApiRoute) {
    const rateLimitResponse = rateLimitMiddleware(request, 'api');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  // ── Build response with security headers ───────────────────
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );

  // CORS headers for API responses
  if (isApiRoute) {
    const origin = request.headers.get('origin') || '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin);
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  return response;
}

/**
 * Matcher: run on all routes except Next.js internals and static assets.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
