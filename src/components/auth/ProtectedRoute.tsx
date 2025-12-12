'use client';

import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionKey, UserRole, ROLE_LABELS } from '@/lib/auth';

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

interface ProtectedRouteProps {
  children: ReactNode;
  // Require specific permission(s)
  requiredPermission?: PermissionKey | PermissionKey[];
  // Require specific role(s)
  requiredRole?: UserRole | UserRole[];
  // Allow guests to view (with limited access)
  allowGuests?: boolean;
  // Custom fallback component
  fallback?: ReactNode;
  // Custom unauthorized component
  unauthorized?: ReactNode;
  // Redirect path for unauthenticated users
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  allowGuests = false,
  fallback,
  unauthorized,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();

  // Check role requirements
  const hasRequiredRole = (): boolean => {
    if (!requiredRole) return true;
    if (!user) return false;

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  };

  // Check permission requirements
  const hasRequiredPermission = (): boolean => {
    if (!requiredPermission) return true;
    if (!user) return false;

    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];

    return permissions.every((perm) => hasPermission(perm));
  };

  // Determine access
  const canAccess = (): boolean => {
    // Allow guests if specified
    if (allowGuests && !isAuthenticated) return true;

    // Must be authenticated
    if (!isAuthenticated) return false;

    // Check role and permission requirements
    return hasRequiredRole() && hasRequiredPermission();
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !allowGuests) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, allowGuests, redirectTo, router]);

  // Loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      )
    );
  }

  // Not authenticated and guests not allowed
  if (!isAuthenticated && !allowGuests) {
    return null; // Will redirect
  }

  // Authenticated but insufficient permissions
  if (isAuthenticated && !canAccess()) {
    return (
      unauthorized || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              غير مصرح بالوصول
            </h2>
            <p className="text-gray-600 mb-4">
              عذراً، ليس لديك الصلاحية للوصول إلى هذه الصفحة.
            </p>
            {user && (
              <p className="text-sm text-gray-500">
                دورك الحالي: {ROLE_LABELS[user.role].ar}
              </p>
            )}
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// ============================================
// PERMISSION GATE COMPONENT
// ============================================

interface PermissionGateProps {
  children: ReactNode;
  permission: PermissionKey | PermissionKey[];
  fallback?: ReactNode;
  // For branch-specific permissions
  targetBranch?: string | null;
}

export function PermissionGate({
  children,
  permission,
  fallback = null,
  targetBranch,
}: PermissionGateProps) {
  const { user, hasPermission, canActOnBranch } = useAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];

  // Check all permissions
  const hasAllPermissions = permissions.every((perm) => {
    if (targetBranch !== undefined) {
      return canActOnBranch(targetBranch, perm);
    }
    return hasPermission(perm);
  });

  if (!user || !hasAllPermissions) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// ROLE GATE COMPONENT
// ============================================

interface RoleGateProps {
  children: ReactNode;
  roles: UserRole | UserRole[];
  fallback?: ReactNode;
}

export function RoleGate({ children, roles, fallback = null }: RoleGateProps) {
  const { user } = useAuth();

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// ADMIN ONLY COMPONENT
// ============================================

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <RoleGate roles={['SUPER_ADMIN', 'ADMIN']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

// ============================================
// SUPER ADMIN ONLY COMPONENT
// ============================================

export function SuperAdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <RoleGate roles="SUPER_ADMIN" fallback={fallback}>
      {children}
    </RoleGate>
  );
}

// ============================================
// AUTHENTICATED ONLY COMPONENT
// ============================================

interface AuthenticatedOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthenticatedOnly({ children, fallback = null }: AuthenticatedOnlyProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// GUEST ONLY COMPONENT (for login/register pages)
// ============================================

interface GuestOnlyProps {
  children: ReactNode;
  redirectTo?: string;
}

export function GuestOnly({ children, redirectTo = '/' }: GuestOnlyProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, redirectTo, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-r-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}
