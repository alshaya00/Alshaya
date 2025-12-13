/**
 * Simple in-memory rate limiter for authentication endpoints
 * In production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
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

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing (e.g., 'login', 'register') */
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterMs: number;
}

/**
 * Check rate limit for a given identifier (usually IP address)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup();

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

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check common headers for proxied requests
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for direct connections (won't work in serverless)
  return 'unknown';
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  /** Login: 5 attempts per 15 minutes per IP */
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'login',
  } as RateLimitConfig,

  /** Register: 3 attempts per hour per IP */
  register: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'register',
  } as RateLimitConfig,

  /** Access Request: 5 attempts per hour per IP */
  accessRequest: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'access-request',
  } as RateLimitConfig,

  /** Password Reset: 3 attempts per hour per IP */
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'password-reset',
  } as RateLimitConfig,

  /** Invite Acceptance: 5 attempts per hour per IP */
  invite: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'invite',
  } as RateLimitConfig,
};

/**
 * Helper to create rate limit error response
 */
export function createRateLimitResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);

  return {
    success: false,
    message: 'Too many requests. Please try again later.',
    messageAr: 'طلبات كثيرة جداً. يرجى المحاولة لاحقاً.',
    retryAfterSeconds,
  };
}
