// Storage Keys Configuration for Al-Shaye Family Tree
// Centralized localStorage/sessionStorage key management

// ============================================
// AUTHENTICATION & SESSION KEYS
// ============================================

export const storageKeys = {
  // Access control
  accessGranted: 'alshaye_access_granted',

  // Session management
  session: 'alshaye_session',
  token: 'alshaye_token',
  sessionId: 'alshaye_session_id',

  // Admin management
  admins: 'alshaye_admins',
  adminCodes: 'alshaye_admin_codes',
  currentAdmin: 'alshaye_current_admin',
  adminAuth: 'alshaye_admin_auth',

  // Theme
  theme: 'alshaye-theme',

  // Data storage
  familyData: 'alshaye_family_data',
  newMembers: 'alshaye_new_members',
  branchLinks: 'alshaye_branch_links',
  pendingMembers: 'alshaye_pending_members',

  // Audit & logs
  auditLog: 'alshaye_audit_log',

  // Backup
  backupConfig: 'alshaye_backup_config',
  backups: 'alshaye_backups',
  backupTimer: 'alshaye_backup_timer',

  // System config
  systemConfig: 'alshaye_system_config',
} as const;

// Type for storage keys
export type StorageKey = typeof storageKeys[keyof typeof storageKeys];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get item from localStorage with type safety
 */
export function getStorageItem<T>(key: StorageKey, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set item in localStorage with type safety
 */
export function setStorageItem<T>(key: StorageKey, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}

/**
 * Remove item from localStorage
 */
export function removeStorageItem(key: StorageKey): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

/**
 * Clear all app-related storage items
 */
export function clearAllStorage(): void {
  if (typeof window === 'undefined') return;
  Object.values(storageKeys).forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
