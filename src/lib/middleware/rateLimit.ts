// Rate Limiting Middleware
// Al-Shaye Family Tree Application

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// TYPES
// ============================================

interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  message?: string;       // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ============================================
// IN-MEMORY STORE (Use Redis in production)
// ============================================

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

// ============================================
// RATE LIMIT CONFIGS
// ============================================

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,          // 10 requests per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  // Login endpoint - very strict
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,           // 5 login attempts per 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  // Password reset - strict
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,           // 3 requests per hour
    message: 'Too many password reset requests. Please try again later.',
  },
  // API endpoints - normal limits
  api: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 requests per minute
    message: 'Too many requests. Please slow down.',
  },
  // Search endpoints - moderate limits
  search: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,          // 30 searches per minute
    message: 'Too many search requests. Please wait a moment.',
  },
  // Export/Import - strict limits
  dataTransfer: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,          // 10 exports/imports per hour
    message: 'Too many data transfer requests. Please try again later.',
  },
  // Admin endpoints - moderate limits
  admin: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 60,          // 60 requests per minute
    message: 'Too many admin requests. Please slow down.',
  },
  // Email/SMS sending - strict limits
  notifications: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,          // 50 emails/SMS per hour
    message: 'Notification limit reached. Please try again later.',
  },
};

// ============================================
// RATE LIMITER FUNCTION
// ============================================

export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  // Use first available IP
  const ip = cfConnectingIp ||
             (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
             realIp ||
             'unknown';

  return ip;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = identifier;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// ============================================
// MIDDLEWARE HELPER
// ============================================

export function rateLimitMiddleware(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'api'
): NextResponse | null {
  const config = RATE_LIMITS[limitType];
  const clientId = getClientIdentifier(request);
  const key = `${limitType}:${clientId}`;

  const result = checkRateLimit(key, config);

  // If rate limited, return error response
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        success: false,
        error: config.message,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  // Rate limit not exceeded, return null (continue processing)
  return null;
}

// ============================================
// RESPONSE HELPERS
// ============================================

export function addRateLimitHeaders(
  response: NextResponse,
  limitType: keyof typeof RATE_LIMITS,
  clientId: string
): NextResponse {
  const config = RATE_LIMITS[limitType];
  const key = `${limitType}:${clientId}`;
  const entry = rateLimitStore.get(key);

  if (entry) {
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString());
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString());
  }

  return response;
}

// ============================================
// HIGHER-ORDER FUNCTION FOR API ROUTES
// ============================================

export function withRateLimit<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  limitType: keyof typeof RATE_LIMITS = 'api'
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Check rate limit
    const rateLimitResponse = rateLimitMiddleware(request, limitType);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Call original handler
    const response = await handler(request, ...args);

    // Add rate limit headers to response
    const clientId = getClientIdentifier(request);
    return addRateLimitHeaders(response, limitType, clientId);
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function resetRateLimit(identifier: string, limitType: keyof typeof RATE_LIMITS): void {
  const key = `${limitType}:${identifier}`;
  rateLimitStore.delete(key);
}

export function getRateLimitStatus(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
): { count: number; remaining: number; resetTime: number } | null {
  const config = RATE_LIMITS[limitType];
  const key = `${limitType}:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < Date.now()) {
    return null;
  }

  return {
    count: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}
