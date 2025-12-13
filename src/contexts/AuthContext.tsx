'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  SessionUser,
  AuthSession,
  PermissionKey,
  UserRole,
  getStoredSession,
  storeSession,
  clearStoredSession,
  userHasPermission,
  userCanActOnBranch,
  isSessionValid,
  getPermissionsForRole,
} from '@/lib/auth';

// ============================================
// AUTH CONTEXT TYPES
// ============================================

interface AuthContextType {
  // State
  user: SessionUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;

  // Permission checks
  hasPermission: (permission: PermissionKey) => boolean;
  canActOnBranch: (targetBranch: string | null | undefined, permission: PermissionKey) => boolean;
  canAssignRole: (role: UserRole) => boolean;

  // Utilities
  getAuthHeader: () => { Authorization: string } | Record<string, never>;
}

interface RegisterData {
  email: string;
  password: string;
  nameArabic: string;
  nameEnglish?: string;
  phone?: string;
  claimedRelation: string;
  relatedMemberId?: string;
  relationshipType?: string;
  message?: string;
}

// ============================================
// DEFAULT CONTEXT VALUES
// ============================================

const defaultContext: AuthContextType = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: true,
  login: async () => ({ success: false, error: 'Context not initialized' }),
  logout: async () => {},
  register: async () => ({ success: false, error: 'Context not initialized' }),
  refreshUser: async () => {},
  hasPermission: () => false,
  canActOnBranch: () => false,
  canAssignRole: () => false,
  getAuthHeader: () => ({}),
};

// ============================================
// CONTEXT CREATION
// ============================================

const AuthContext = createContext<AuthContextType>(defaultContext);

// ============================================
// AUTH PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Computed values
  const user = session?.user ?? null;
  const isAuthenticated = !!user && user.status === 'ACTIVE';
  const isGuest = !user || user.role === 'GUEST';

  // ============================================
  // INITIALIZE SESSION FROM STORAGE
  // ============================================

  useEffect(() => {
    const initSession = () => {
      try {
        const stored = getStoredSession();
        if (stored && isSessionValid(stored)) {
          setSession(stored);
          // Optionally validate with server
          validateSessionWithServer(stored.token);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        clearStoredSession();
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  // ============================================
  // VALIDATE SESSION WITH SERVER
  // ============================================

  const validateSessionWithServer = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Session invalid on server
        clearStoredSession();
        setSession(null);
        return;
      }

      const data = await response.json();
      if (data.user) {
        // Update session with fresh user data
        setSession((prev) =>
          prev
            ? {
                ...prev,
                user: {
                  ...data.user,
                  permissions: getPermissionsForRole(data.user.role),
                },
              }
            : null
        );
      }
    } catch {
      // Network error - keep local session but mark for revalidation
      console.warn('Could not validate session with server');
    }
  };

  // ============================================
  // LOGIN
  // ============================================

  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe: boolean = false
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.messageAr || data.message || 'Login failed',
          };
        }

        if (data.success && data.user && data.token) {
          const newSession: AuthSession = {
            user: {
              ...data.user,
              permissions: getPermissionsForRole(data.user.role),
            },
            token: data.token,
            expiresAt: new Date(data.expiresAt),
          };

          storeSession(newSession, rememberMe);
          setSession(newSession);

          return { success: true };
        }

        return { success: false, error: data.message || 'Login failed' };
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Network error. Please try again.' };
      }
    },
    []
  );

  // ============================================
  // LOGOUT
  // ============================================

  const logout = useCallback(async () => {
    try {
      const token = session?.token;
      if (token) {
        // Notify server to invalidate session
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          // Ignore errors - we're logging out anyway
        });
      }
    } finally {
      clearStoredSession();
      setSession(null);
    }
  }, [session]);

  // ============================================
  // REGISTER
  // ============================================

  const register = useCallback(
    async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: result.messageAr || result.message || 'Registration failed',
          };
        }

        return { success: true };
      } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Network error. Please try again.' };
      }
    },
    []
  );

  // ============================================
  // REFRESH USER
  // ============================================

  const refreshUser = useCallback(async () => {
    if (!session?.token) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  user: {
                    ...data.user,
                    permissions: getPermissionsForRole(data.user.role),
                  },
                }
              : null
          );

          // Update storage
          if (session) {
            storeSession(
              {
                ...session,
                user: {
                  ...data.user,
                  permissions: getPermissionsForRole(data.user.role),
                },
              },
              localStorage.getItem('alshaye_session') !== null
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [session]);

  // ============================================
  // PERMISSION CHECKS
  // ============================================

  const hasPermission = useCallback(
    (permission: PermissionKey): boolean => {
      return userHasPermission(user, permission);
    },
    [user]
  );

  const canActOnBranch = useCallback(
    (targetBranch: string | null | undefined, permission: PermissionKey): boolean => {
      return userCanActOnBranch(user, targetBranch, permission);
    },
    [user]
  );

  const canAssignRole = useCallback(
    (role: UserRole): boolean => {
      if (!user) return false;

      switch (user.role) {
        case 'SUPER_ADMIN':
          return true;
        case 'ADMIN':
          return role !== 'SUPER_ADMIN';
        case 'BRANCH_LEADER':
          return role === 'MEMBER';
        default:
          return false;
      }
    },
    [user]
  );

  // ============================================
  // GET AUTH HEADER
  // ============================================

  const getAuthHeader = useCallback((): { Authorization: string } | Record<string, never> => {
    if (session?.token) {
      return { Authorization: `Bearer ${session.token}` };
    }
    return {};
  }, [session]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated,
    isGuest,
    login,
    logout,
    register,
    refreshUser,
    hasPermission,
    canActOnBranch,
    canAssignRole,
    getAuthHeader,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOKS
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check a specific permission
 */
export function usePermission(permission: PermissionKey): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

/**
 * Hook to require authentication
 * Returns the auth context if authenticated, redirects to login otherwise
 */
export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // In a real app, you'd redirect to login
      // For now, we'll just log a warning
      console.warn('Authentication required');
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
}

/**
 * Hook to require a specific role
 */
export function useRequireRole(requiredRoles: UserRole[]) {
  const auth = useAuth();

  const hasRequiredRole = auth.user ? requiredRoles.includes(auth.user.role) : false;

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !hasRequiredRole) {
      console.warn('Insufficient permissions');
    }
  }, [auth.isLoading, auth.isAuthenticated, hasRequiredRole]);

  return { ...auth, hasRequiredRole };
}
