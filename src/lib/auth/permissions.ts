// Permission Matrix Management
import {
  PermissionKey,
  PermissionMatrix,
  UserRole,
  DEFAULT_PERMISSION_MATRIX,
  PERMISSION_KEYS,
  USER_ROLES,
} from './types';

// In-memory cache for permission matrix (will be loaded from DB)
let permissionMatrixCache: PermissionMatrix | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get the permission matrix (from cache or default)
 */
export function getPermissionMatrix(): PermissionMatrix {
  // For now, return default matrix
  // In production, this will load from database
  if (permissionMatrixCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return permissionMatrixCache;
  }
  return DEFAULT_PERMISSION_MATRIX;
}

/**
 * Set/update the permission matrix cache
 */
export function setPermissionMatrixCache(matrix: PermissionMatrix): void {
  permissionMatrixCache = matrix;
  cacheTimestamp = Date.now();
}

/**
 * Clear the permission matrix cache
 */
export function clearPermissionMatrixCache(): void {
  permissionMatrixCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: PermissionKey,
  matrix?: PermissionMatrix
): boolean {
  const m = matrix || getPermissionMatrix();
  return m[role]?.[permission] ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(
  role: UserRole,
  matrix?: PermissionMatrix
): Record<PermissionKey, boolean> {
  const m = matrix || getPermissionMatrix();
  return m[role] || ({} as Record<PermissionKey, boolean>);
}

/**
 * Check if a user can perform an action on a specific branch
 * Branch leaders can only act within their branch
 */
export function canActOnBranch(
  userRole: UserRole,
  userBranch: string | null | undefined,
  targetBranch: string | null | undefined,
  permission: PermissionKey
): boolean {
  // Super admin and admin can act on any branch
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    return hasPermission(userRole, permission);
  }

  // Branch leaders can only act on their assigned branch
  if (userRole === 'BRANCH_LEADER') {
    if (!userBranch || !targetBranch) {
      return false;
    }
    if (userBranch !== targetBranch) {
      return false;
    }
    return hasPermission(userRole, permission);
  }

  // Members and guests - check permission directly
  return hasPermission(userRole, permission);
}

/**
 * Get roles that a user can assign to others
 * Super admin: all roles
 * Admin: all except SUPER_ADMIN
 * Branch leader: only MEMBER within their branch
 * Others: none
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  switch (userRole) {
    case 'SUPER_ADMIN':
      return [...USER_ROLES];
    case 'ADMIN':
      return ['ADMIN', 'BRANCH_LEADER', 'MEMBER', 'GUEST'];
    case 'BRANCH_LEADER':
      return ['MEMBER'];
    default:
      return [];
  }
}

/**
 * Check if a role can be modified by another role
 */
export function canModifyRole(actorRole: UserRole, targetRole: UserRole): boolean {
  const assignableRoles = getAssignableRoles(actorRole);
  return assignableRoles.includes(targetRole);
}

/**
 * Validate a permission matrix
 */
export function validatePermissionMatrix(matrix: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!matrix || typeof matrix !== 'object') {
    return { valid: false, errors: ['Matrix must be an object'] };
  }

  const m = matrix as Record<string, Record<string, boolean>>;

  for (const role of USER_ROLES) {
    if (!m[role]) {
      errors.push(`Missing role: ${role}`);
      continue;
    }

    for (const permission of PERMISSION_KEYS) {
      if (typeof m[role][permission] !== 'boolean') {
        errors.push(`Missing or invalid permission ${permission} for role ${role}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge partial matrix updates with existing matrix
 */
export function mergePermissionMatrix(
  existing: PermissionMatrix,
  updates: Partial<Record<UserRole, Partial<Record<PermissionKey, boolean>>>>
): PermissionMatrix {
  const merged = { ...existing };

  for (const role of USER_ROLES) {
    if (updates[role]) {
      merged[role] = {
        ...merged[role],
        ...updates[role],
      } as Record<PermissionKey, boolean>;
    }
  }

  return merged;
}

/**
 * Get the permission matrix as JSON string for storage
 */
export function serializePermissionMatrix(matrix: PermissionMatrix): string {
  return JSON.stringify(matrix);
}

/**
 * Parse a permission matrix from JSON string
 */
export function parsePermissionMatrix(json: string): PermissionMatrix | null {
  try {
    const parsed = JSON.parse(json);
    const validation = validatePermissionMatrix(parsed);
    if (!validation.valid) {
      console.error('Invalid permission matrix:', validation.errors);
      return null;
    }
    return parsed as PermissionMatrix;
  } catch {
    console.error('Failed to parse permission matrix');
    return null;
  }
}

/**
 * Get a diff between two permission matrices
 */
export function diffPermissionMatrices(
  oldMatrix: PermissionMatrix,
  newMatrix: PermissionMatrix
): Array<{
  role: UserRole;
  permission: PermissionKey;
  oldValue: boolean;
  newValue: boolean;
}> {
  const changes: Array<{
    role: UserRole;
    permission: PermissionKey;
    oldValue: boolean;
    newValue: boolean;
  }> = [];

  for (const role of USER_ROLES) {
    for (const permission of PERMISSION_KEYS) {
      const oldValue = oldMatrix[role][permission];
      const newValue = newMatrix[role][permission];
      if (oldValue !== newValue) {
        changes.push({ role, permission, oldValue, newValue });
      }
    }
  }

  return changes;
}

/**
 * Create a permission checker function for a user
 */
export function createPermissionChecker(
  role: UserRole,
  assignedBranch?: string | null,
  overrides?: Record<PermissionKey, boolean>
): (permission: PermissionKey, targetBranch?: string | null) => boolean {
  const basePermissions = getPermissionsForRole(role);
  const effectivePermissions = overrides
    ? { ...basePermissions, ...overrides }
    : basePermissions;

  return (permission: PermissionKey, targetBranch?: string | null) => {
    // If no permission at all, return false
    if (!effectivePermissions[permission]) {
      return false;
    }

    // For branch-restricted operations, check branch match
    if (role === 'BRANCH_LEADER' && targetBranch) {
      const branchRestrictedPermissions: PermissionKey[] = [
        'add_member',
        'edit_member',
        'approve_pending_members',
        'invite_users',
        'manage_branch_links',
      ];

      if (branchRestrictedPermissions.includes(permission)) {
        return assignedBranch === targetBranch;
      }
    }

    return true;
  };
}
