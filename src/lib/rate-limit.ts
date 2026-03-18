/**
 * Unified Rate Limiter
 * Al-Shaya Family Tree Application
 *
 * Consolidates all rate-limiting logic into a single module.
 * In production, consider using Redis for distributed rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// TYPES
// ============================================

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing (e.g., 'login', 'register') */
  keyPrefix: string;
  /** Custom error message (English) */
  message?: string;
  /** Custom error message (Arabic) */
  messageAr?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ============================================
// IN-MEMORY STORE (Use Redis in production)
// ============================================

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't keep the process alive just for cleanup
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// ============================================
// RATE LIMIT CONFIGS
// ============================================

/**
 * Pre-configured rate limiters for auth routes (config-object style).
 * Each entry includes a keyPrefix for namespacing.
 */
export const rateLimiters = {
  /** Login: 20 attempts per 15 minutes per IP */
  login: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'login',
    message: 'Too many login attempts. Please try again in 15 minutes.',
    messageAr: 'محاولات تسجيل دخول كثيرة جداً. يرجى المحاولة بعد 15 دقيقة.',
  } as RateLimitConfig,

  /** Register: 3 attempts per hour per IP */
  register: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'register',
    message: 'Too many registration attempts. Please try again later.',
    messageAr: 'محاولات تسجيل كثيرة جداً. يرجى المحاولة لاحقاً.',
  } as RateLimitConfig,

  /** Access Request: 5 attempts per hour per IP */
  accessRequest: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'access-request',
    message: 'Too many access requests. Please try again later.',
    messageAr: 'طلبات وصول كثيرة جداً. يرجى المحاولة لاحقاً.',
  } as RateLimitConfig,

  /** Password Reset: 3 attempts per hour per IP */
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'password-reset',
    message: 'Too many password reset requests. Please try again later.',
    messageAr: 'طلبات إعادة تعيين كلمة المرور كثيرة جداً. يرجى المحاولة لاحقاً.',
  } as RateLimitConfig,

  /** Invite Acceptance: 5 attempts per hour per IP */
  invite: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'invite',
    message: 'Too many invite attempts. Please try again later.',
    messageAr: 'محاولات دعوة كثيرة جداً. يرجى المحاولة لاحقاً.',
  } as RateLimitConfig,
};

/**
 * RATE_LIMITS record for middleware-style and OTP/public endpoint usage.
 * Keys without keyPrefix are used with rateLimitMiddleware / withRateLimit.
 * Keys like OTP_SEND are used with the positional-args overload.
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // --- Middleware-style configs (from middleware/rateLimit.ts) ---
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'auth',
    message: 'Too many authentication attempts. Please try again later.',
    messageAr: 'محاولات مصادقة كثيرة جداً. يرجى المحاولة لاحقاً.',
  },
  login: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'login',
    message: 'Too many login attempts. Please try again in 15 minutes.',
    messageAr: 'محاولات تسجيل دخول كثيرة جداً. يرجى المحاولة بعد 15 دقيقة.',
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyPrefix: 'password-reset',
    message: 'Too many password reset requests. Please try again later.',
    messageAr: 'طلبات إعادة تعيين كلمة المرور كثيرة جداً. يرجى المحاولة لاحقاً.',
  },
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api',
    message: 'Too many requests. Please slow down.',
    messageAr: 'طلبات كثيرة جداً. يرجى التباطؤ.',
  },
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'search',
    message: 'Too many search requests. Please wait a moment.',
    messageAr: 'طلبات بحث كثيرة جداً. يرجى الانتظار لحظة.',
  },
  dataTransfer: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'data-transfer',
    message: 'Too many data transfer requests. Please try again later.',
    messageAr: 'طلبات نقل بيانات كثيرة جداً. يرجى المحاولة لاحقاً.',
  },
  admin: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyPrefix: 'admin',
    message: 'Too many admin requests. Please slow down.',
    messageAr: 'طلبات إدارة كثيرة جداً. يرجى التباطؤ.',
  },
  notifications: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
    keyPrefix: 'notifications',
    message: 'Notification limit reached. Please try again later.',
    messageAr: 'تم الوصول لحد الإشعارات. يرجى المحاولة لاحقاً.',
  },

  // --- OTP / public endpoint configs (from rate-limiter.ts) ---
  OTP_SEND: {
    maxRequests: 30,
    windowMs: 5 * 60 * 1000,
    keyPrefix: 'otp-send',
    message: 'Too many OTP requests. Please try again later.',
    messageAr: 'طلبات رمز تحقق كثيرة جداً. يرجى المحاولة لاحقاً.',
  },
  OTP_VERIFY: {
    maxRequests: 60,
    windowMs: 5 * 60 * 1000,
    keyPrefix: 'otp-verify',
    message: 'Too many verification attempts. Please try again later.',
    messageAr: 'محاولات تحقق كثيرة جداً. يرجى المحاولة لاحقاً.',
  },
  REGISTER: {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
    keyPrefix: 'register-public',
    message: 'Too many registration attempts. Please try again later.',
    messageAr: 'محاولات تسجيل كثيرة جداً. يرجى المحاولة لاحقاً.',
  },
  DUPLICATE_CHECK: {
    maxRequests: 50,
    windowMs: 60 * 1000,
    keyPrefix: 'duplicate-check',
    message: 'Too many duplicate check requests. Please slow down.',
    messageAr: 'طلبات فحص التكرار كثيرة جداً. يرجى التباطؤ.',
  },
};

// ============================================
// CORE RATE LIMITER
// ============================================

/**
 * Check rate limit for a given identifier.
 *
 * Supports two call signatures for backward compatibility:
 *
 * 1. Config-object style (used by auth routes):
 *    checkRateLimit(identifier: string, config: RateLimitConfig)
 *
 * 2. Positional-args style (used by OTP/register/duplicate-check routes):
 *    checkRateLimit(ip: string, endpoint: string, limit: number, windowMs: number)
 */
export function checkRateLimit(
  identifier: string,
  configOrEndpoint: RateLimitConfig | string,
  limit?: number,
  windowMs?: number,
): RateLimitResult {
  startCleanup();

  let config: RateLimitConfig;

  if (typeof configOrEndpoint === 'string') {
    // Positional-args style: checkRateLimit(ip, endpoint, limit, windowMs)
    config = {
      keyPrefix: configOrEndpoint,
      maxRequests: limit!,
      windowMs: windowMs!,
    };
  } else {
    // Config-object style: checkRateLimit(identifier, config)
    config = configOrEndpoint;
  }

  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
      retryAfterMs: 0,
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
      retryAfterMs: entry.resetTime - now,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    retryAfterMs: 0,
  };
}

// ============================================
// CLIENT IDENTIFICATION
// ============================================

/**
 * Get client IP from request headers.
 * Checks cf-connecting-ip, x-forwarded-for, and x-real-ip.
 */
export function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

/** Alias for getClientIp (NextRequest compatible) */
export function getClientIdentifier(request: NextRequest): string {
  return getClientIp(request);
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Helper to create rate limit error response.
 *
 * Supports two call signatures:
 *
 * 1. Result-object style (used by auth routes):
 *    createRateLimitResponse(result: RateLimitResult)
 *
 * 2. Date style (used by OTP/register/duplicate-check routes):
 *    createRateLimitResponse(resetAt: Date, lang?: 'ar' | 'en')
 */
export function createRateLimitResponse(
  resultOrResetAt: RateLimitResult | Date,
  lang?: 'ar' | 'en',
) {
  if (resultOrResetAt instanceof Date) {
    // Date style: createRateLimitResponse(resetAt, lang)
    const now = Date.now();
    const seconds = Math.ceil((resultOrResetAt.getTime() - now) / 1000);

    if (lang === 'en') {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${seconds} seconds`,
      };
    }

    return {
      success: false,
      error: `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${seconds} ثانية`,
    };
  }

  // Result-object style: createRateLimitResponse(result)
  const retryAfterSeconds = Math.ceil(resultOrResetAt.retryAfterMs / 1000);

  return {
    success: false,
    message: 'Too many requests. Please try again later.',
    messageAr: 'طلبات كثيرة جداً. يرجى المحاولة لاحقاً.',
    retryAfterSeconds,
  };
}

// ============================================
// MIDDLEWARE HELPER
// ============================================

/**
 * Rate limit middleware for Next.js API routes.
 * Returns a 429 NextResponse if rate limited, or null to continue.
 */
export function rateLimitMiddleware(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'api',
): NextResponse | null {
  const config = RATE_LIMITS[limitType];
  const clientId = getClientIdentifier(request);
  const key = `${limitType}:${clientId}`;

  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        success: false,
        error: config.message,
        errorAr: config.messageAr,
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
      },
    );
  }

  return null;
}

// ============================================
// RESPONSE HEADER HELPERS
// ============================================

export function addRateLimitHeaders(
  response: NextResponse,
  limitType: keyof typeof RATE_LIMITS,
  clientId: string,
): NextResponse {
  const config = RATE_LIMITS[limitType];
  const key = `${limitType}:${clientId}`;
  const entry = rateLimitStore.get(key);

  if (entry) {
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set(
      'X-RateLimit-Remaining',
      Math.max(0, config.maxRequests - entry.count).toString(),
    );
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString());
  }

  return response;
}

// ============================================
// HIGHER-ORDER FUNCTION FOR API ROUTES
// ============================================

export function withRateLimit<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  limitType: keyof typeof RATE_LIMITS = 'api',
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const rateLimitResponse = rateLimitMiddleware(request, limitType);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const response = await handler(request, ...args);

    const clientId = getClientIdentifier(request);
    return addRateLimitHeaders(response, limitType, clientId);
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function resetRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS,
): void {
  const key = `${limitType}:${identifier}`;
  rateLimitStore.delete(key);
}

export function getRateLimitStatus(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS,
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
