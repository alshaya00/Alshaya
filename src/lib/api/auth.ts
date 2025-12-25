/**
 * Shared API Authentication Utilities
 * Provides consistent auth handling across all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById, StoredUser } from '@/lib/auth/store';
import { hasPermission } from '@/lib/auth/permissions';
import { UserRole, PermissionKey } from '@/lib/auth/types';
import { logger } from '@/lib/logging';
import { checkRateLimit, RateLimitConfig, RATE_LIMITS } from '@/lib/middleware/rateLimit';

export interface AuthResult {
  user: StoredUser;
  session: { userId: string; token: string };
}

export interface AuthError {
  success: false;
  error: string;
  errorAr?: string;
  status: number;
}

/**
 * Get authenticated user from request
 * Returns null if not authenticated
 */
export async function getAuthUser(request: NextRequest): Promise<StoredUser | null> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  return user;
}

/**
 * Require authentication - returns error response if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<StoredUser | NextResponse> {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required', errorAr: 'يجب تسجيل الدخول' },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Require specific role(s)
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<StoredUser | NextResponse> {
  const result = await requireAuth(request);

  if (result instanceof NextResponse) {
    return result;
  }

  const user = result;

  if (!allowedRoles.includes(user.role as UserRole)) {
    logger.security('Unauthorized access attempt', 'medium', {
      userId: user.id,
      userRole: user.role,
      requiredRoles: allowedRoles,
      path: request.nextUrl.pathname,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Insufficient permissions',
        errorAr: 'صلاحيات غير كافية',
      },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Require specific permission
 */
export async function requirePermission(
  request: NextRequest,
  permission: PermissionKey
): Promise<StoredUser | NextResponse> {
  const result = await requireAuth(request);

  if (result instanceof NextResponse) {
    return result;
  }

  const user = result;

  if (!hasPermission(user.role as UserRole, permission)) {
    logger.security('Permission denied', 'low', {
      userId: user.id,
      userRole: user.role,
      requiredPermission: permission,
      path: request.nextUrl.pathname,
    });

    return NextResponse.json(
      {
        success: false,
        error: `Permission required: ${permission}`,
        errorAr: 'صلاحية غير متوفرة',
      },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Require admin role (ADMIN or SUPER_ADMIN)
 */
export async function requireAdmin(request: NextRequest): Promise<StoredUser | NextResponse> {
  return requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin(request: NextRequest): Promise<StoredUser | NextResponse> {
  return requireRole(request, ['SUPER_ADMIN']);
}

/**
 * Check rate limit for a request
 * Returns error response if rate limited
 */
export function checkRequestRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const key = identifier || `${config.name || 'api'}:${ip}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: result.message || 'Too many requests',
        errorAr: 'عدد كبير جداً من الطلبات',
        retryAfter: Math.ceil(result.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.resetIn / 1000)),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Date.now() + result.resetIn),
        },
      }
    );
  }

  return null;
}

/**
 * Apply rate limit to an authenticated user
 */
export function checkUserRateLimit(
  user: StoredUser,
  config: RateLimitConfig
): NextResponse | null {
  const key = `${config.name || 'api'}:user:${user.id}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: result.message || 'Too many requests',
        errorAr: 'عدد كبير جداً من الطلبات',
        retryAfter: Math.ceil(result.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.resetIn / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Create standardized error response
 */
export function errorResponse(
  error: string,
  status: number = 500,
  errorAr?: string,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      errorAr,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Create standardized success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  messageAr?: string
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message }),
    ...(messageAr && { messageAr }),
  });
}

// Re-export rate limit configs for convenience
export { RATE_LIMITS } from '@/lib/middleware/rateLimit';
