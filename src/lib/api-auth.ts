import { NextRequest } from 'next/server';
import { apiUnauthorized, apiForbidden } from './api-response';
import { findSessionByToken, findUserById } from './auth/db-store';
import type { UserRole } from './auth/types';

export type { UserRole };

// Get authenticated user from request, or return error response
export async function getAuthUser(request: NextRequest) {
  // Try session token from cookie or Authorization header
  const token = request.cookies.get('session_token')?.value
    || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return { user: null, error: apiUnauthorized() };
  }

  const session = await findSessionByToken(token);
  if (!session) {
    return { user: null, error: apiUnauthorized('Session expired', 'انتهت الجلسة') };
  }

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') {
    return { user: null, error: apiUnauthorized('Session expired', 'انتهت الجلسة') };
  }

  return { user, error: null };
}

// Check if user has required role
export function requireRole(userRole: string, requiredRoles: UserRole[]) {
  if (!requiredRoles.includes(userRole as UserRole)) {
    return apiForbidden('Insufficient permissions', 'صلاحيات غير كافية');
  }
  return null;
}
