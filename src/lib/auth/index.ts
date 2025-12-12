// Auth Module - Main Exports
// Al-Shaye Family Tree Authentication System

export * from './types';
export * from './password';
export * from './permissions';
export * from './session';

// Re-export commonly used items for convenience
export {
  // Types
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
  // Constants
  USER_ROLES,
  ROLE_LABELS,
  STATUS_LABELS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  PERMISSION_CATEGORIES,
  DEFAULT_PERMISSION_MATRIX,
} from './types';

export {
  // Password utilities
  hashPassword,
  verifyPassword,
  validatePassword,
  generateToken,
  generateInviteCode,
  generateSessionToken,
} from './password';

export {
  // Permission utilities
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
  // Session utilities
  createSession,
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
