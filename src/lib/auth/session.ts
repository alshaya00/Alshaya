// Session Management Utilities
import { SessionUser, UserRole, PermissionKey, AuthSession } from './types';
import { getPermissionsForRole } from './permissions';
import { generateSessionToken } from './password';

// Session storage key
const SESSION_STORAGE_KEY = 'alshaye_session';
const SESSION_TOKEN_KEY = 'alshaye_token';

// Default session durations
const DEFAULT_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Create a new session for a user
 */
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

  // Build session user with permissions
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

/**
 * Store session in browser storage
 */
export function storeSession(session: AuthSession, rememberMe: boolean = false): void {
  if (typeof window === 'undefined') return;

  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    user: session.user,
    expiresAt: session.expiresAt.toISOString(),
  }));
  storage.setItem(SESSION_TOKEN_KEY, session.token);

  // Also store in the other storage to track which was used
  const otherStorage = rememberMe ? sessionStorage : localStorage;
  otherStorage.removeItem(SESSION_STORAGE_KEY);
  otherStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Retrieve session from browser storage
 */
export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  // Try localStorage first (remember me), then sessionStorage
  let sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
  let token = localStorage.getItem(SESSION_TOKEN_KEY);

  if (!sessionData || !token) {
    sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
    token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  }

  if (!sessionData || !token) return null;

  try {
    const parsed = JSON.parse(sessionData);
    const expiresAt = new Date(parsed.expiresAt);

    // Check if session is expired
    if (expiresAt < new Date()) {
      clearStoredSession();
      return null;
    }

    return {
      user: parsed.user as SessionUser,
      token,
      expiresAt,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

/**
 * Clear session from browser storage
 */
export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Get the session token from storage
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Check if user has a specific permission
 */
export function userHasPermission(user: SessionUser | null, permission: PermissionKey): boolean {
  if (!user) return false;
  return user.permissions[permission] ?? false;
}

/**
 * Check if user can act on a specific branch
 */
export function userCanActOnBranch(
  user: SessionUser | null,
  targetBranch: string | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;

  // First check base permission
  if (!userHasPermission(user, permission)) {
    return false;
  }

  // Super admin and admin can act on any branch
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    return true;
  }

  // Branch leader can only act on their branch
  if (user.role === 'BRANCH_LEADER') {
    const branchRestrictedPermissions: PermissionKey[] = [
      'add_member',
      'edit_member',
      'approve_pending_members',
      'invite_users',
      'manage_branch_links',
    ];

    if (branchRestrictedPermissions.includes(permission) && targetBranch) {
      return user.assignedBranch === targetBranch;
    }
  }

  return true;
}

/**
 * Check if session is still valid
 */
export function isSessionValid(session: AuthSession | null): boolean {
  if (!session) return false;
  if (session.user.status !== 'ACTIVE') return false;
  if (new Date(session.expiresAt) < new Date()) return false;
  return true;
}

/**
 * Refresh session with updated user data
 */
export function refreshSessionUser(
  session: AuthSession,
  updatedUser: Partial<SessionUser>
): AuthSession {
  return {
    ...session,
    user: {
      ...session.user,
      ...updatedUser,
      // Refresh permissions if role changed
      permissions: updatedUser.role
        ? getPermissionsForRole(updatedUser.role)
        : session.user.permissions,
    },
  };
}

/**
 * Format session expiry for display
 */
export function formatSessionExpiry(expiresAt: Date, locale: 'ar' | 'en' = 'ar'): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (locale === 'ar') {
    if (days > 0) {
      return `${days} يوم${days > 1 ? '' : ''} ${hours > 0 ? `و ${hours} ساعة` : ''}`;
    }
    return `${hours} ساعة`;
  }

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours > 0 ? `and ${hours} hours` : ''}`;
  }
  return `${hours} hour${hours > 1 ? 's' : ''}`;
}
