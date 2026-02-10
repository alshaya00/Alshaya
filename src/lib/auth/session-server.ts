// Server-only session creation utility
// WARNING: This file uses Node.js crypto via './password' and must NOT be imported by client components.
// Client code should import session utilities from './session' or '@/lib/auth' instead.

import { SessionUser, UserRole, AuthSession } from './types';
import { getPermissionsForRole } from './permissions';
import { sessionConfig } from '@/config/admin-config';
import { generateSessionToken } from './password';

const DEFAULT_SESSION_DURATION = sessionConfig.defaultDurationMs;
const REMEMBER_ME_DURATION = sessionConfig.rememberMeDurationMs;

export function createSession(
  user: {
    id: string;
    email: string;
    nameArabic: string;
    nameEnglish?: string | null;
    role: UserRole;
    status: string;
    linkedMemberId?: string | null;
    assignedBranch?: string | null;
  },
  rememberMe: boolean = false
): AuthSession {
  const token = generateSessionToken();
  const duration = rememberMe ? REMEMBER_ME_DURATION : DEFAULT_SESSION_DURATION;
  const expiresAt = new Date(Date.now() + duration);

  const permissions = getPermissionsForRole(user.role as UserRole);

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    nameArabic: user.nameArabic,
    nameEnglish: user.nameEnglish,
    role: user.role as UserRole,
    status: user.status as 'PENDING' | 'ACTIVE' | 'DISABLED',
    linkedMemberId: user.linkedMemberId,
    assignedBranch: user.assignedBranch,
    permissions,
  };

  return {
    user: sessionUser,
    token,
    expiresAt,
  };
}
