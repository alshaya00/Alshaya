/**
 * Simple in-memory rate limiter for public API endpoints
 * Uses Map with IP-based tracking and periodic cleanup
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export function checkRateLimit(
  ip: string,
  endpoint: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  startCleanup();

  const key = `${endpoint}:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(entry.resetAt),
    };
  }

  entry.count++;

  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
    };
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export function createRateLimitResponse(resetAt: Date, lang: 'ar' | 'en' = 'ar') {
  const now = Date.now();
  const seconds = Math.ceil((resetAt.getTime() - now) / 1000);

  if (lang === 'ar') {
    return {
      success: false,
      error: `تم تجاوز الحد المسموح. حاول مرة أخرى بعد ${seconds} ثانية`,
    };
  }

  return {
    success: false,
    error: `Rate limit exceeded. Try again in ${seconds} seconds`,
  };
}

export const RATE_LIMITS = {
  OTP_SEND: { limit: 5, windowMs: 60 * 1000 },
  OTP_VERIFY: { limit: 10, windowMs: 60 * 1000 },
  REGISTER: { limit: 5, windowMs: 60 * 1000 },
  DUPLICATE_CHECK: { limit: 20, windowMs: 60 * 1000 },
};
