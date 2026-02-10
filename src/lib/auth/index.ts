// Auth Module - Main Exports
// Al-Shaya Family Tree Authentication System
//
// NOTE: Password utilities (hashPassword, verifyPassword, etc.) are NOT
// re-exported here because they use Node.js 'crypto' and 'bcryptjs' which
// must not be included in client bundles. Import them directly from
// '@/lib/auth/password' in server-side code (API routes) only.

export * from './types';
export * from './permissions';
export * from './session';

export {
  type UserRole,
  type UserStatus,
  type PermissionKey,
  type PermissionMatrix,
  type SessionUser,
  type AuthSession,
  type User,
  type LoginRequest,
  type RegisterRequest,
  type InviteRequest,
  type AuthResponse,
  type ActivityAction,
  type ActivityCategory,
  type ActivityLogEntry,
  USER_ROLES,
  ROLE_LABELS,
  STATUS_LABELS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  PERMISSION_CATEGORIES,
  DEFAULT_PERMISSION_MATRIX,
} from './types';

export {
  getPermissionMatrix,
  setPermissionMatrixCache,
  clearPermissionMatrixCache,
  hasPermission,
  getPermissionsForRole,
  canActOnBranch,
  getAssignableRoles,
  canModifyRole,
  validatePermissionMatrix,
  mergePermissionMatrix,
  serializePermissionMatrix,
  parsePermissionMatrix,
  diffPermissionMatrices,
  createPermissionChecker,
} from './permissions';

export {
  storeSession,
  getStoredSession,
  clearStoredSession,
  getStoredToken,
  userHasPermission,
  userCanActOnBranch,
  isSessionValid,
  refreshSessionUser,
  formatSessionExpiry,
} from './session';
