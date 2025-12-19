/**
 * Role-Based Access Control (RBAC) System
 * Manages admin permissions and access control across the application
 */

import { storageKeys } from '@/config/storage-keys';
import { accessCodeConfig } from '@/config/admin-config';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface Permission {
  key: string;
  label: string;
  labelEn: string;
  category: 'members' | 'data' | 'history' | 'admin' | 'audit' | 'backup';
  description: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// All available permissions in the system
export const ALL_PERMISSIONS: Permission[] = [
  // Members permissions
  { key: 'VIEW_MEMBERS', label: 'عرض الأعضاء', labelEn: 'View Members', category: 'members', description: 'Can view family members' },
  { key: 'ADD_MEMBERS', label: 'إضافة أعضاء', labelEn: 'Add Members', category: 'members', description: 'Can add new family members' },
  { key: 'EDIT_MEMBERS', label: 'تعديل أعضاء', labelEn: 'Edit Members', category: 'members', description: 'Can edit existing members' },
  { key: 'DELETE_MEMBERS', label: 'حذف أعضاء', labelEn: 'Delete Members', category: 'members', description: 'Can delete members' },
  { key: 'CHANGE_PARENT', label: 'تغيير الأب', labelEn: 'Change Parent', category: 'members', description: 'Can change member parent relationships' },
  { key: 'BULK_OPERATIONS', label: 'العمليات المجمعة', labelEn: 'Bulk Operations', category: 'members', description: 'Can perform bulk operations on members' },

  // Data permissions
  { key: 'EXPORT_DATA', label: 'تصدير البيانات', labelEn: 'Export Data', category: 'data', description: 'Can export family data' },
  { key: 'IMPORT_DATA', label: 'استيراد البيانات', labelEn: 'Import Data', category: 'data', description: 'Can import data' },
  { key: 'MANAGE_DUPLICATES', label: 'إدارة التكرارات', labelEn: 'Manage Duplicates', category: 'data', description: 'Can manage duplicate entries' },
  { key: 'MANAGE_BRANCHES', label: 'إدارة الفروع', labelEn: 'Manage Branches', category: 'data', description: 'Can manage branch links' },

  // History permissions
  { key: 'VIEW_HISTORY', label: 'عرض السجل', labelEn: 'View History', category: 'history', description: 'Can view change history' },
  { key: 'ROLLBACK_CHANGES', label: 'استرجاع التغييرات', labelEn: 'Rollback Changes', category: 'history', description: 'Can rollback previous changes' },

  // Backup permissions
  { key: 'VIEW_BACKUPS', label: 'عرض النسخ الاحتياطية', labelEn: 'View Backups', category: 'backup', description: 'Can view backup list' },
  { key: 'CREATE_BACKUPS', label: 'إنشاء نسخ احتياطية', labelEn: 'Create Backups', category: 'backup', description: 'Can create manual backups' },
  { key: 'RESTORE_BACKUPS', label: 'استعادة النسخ', labelEn: 'Restore Backups', category: 'backup', description: 'Can restore from backups' },
  { key: 'DELETE_BACKUPS', label: 'حذف النسخ الاحتياطية', labelEn: 'Delete Backups', category: 'backup', description: 'Can delete backups' },
  { key: 'CONFIGURE_AUTO_BACKUP', label: 'إعداد النسخ التلقائي', labelEn: 'Configure Auto Backup', category: 'backup', description: 'Can configure automatic backup settings' },

  // Audit permissions
  { key: 'VIEW_AUDIT_LOG', label: 'عرض سجل المراجعة', labelEn: 'View Audit Log', category: 'audit', description: 'Can view audit logs' },
  { key: 'EXPORT_AUDIT_LOG', label: 'تصدير سجل المراجعة', labelEn: 'Export Audit Log', category: 'audit', description: 'Can export audit logs' },
  { key: 'CLEAR_AUDIT_LOG', label: 'مسح سجل المراجعة', labelEn: 'Clear Audit Log', category: 'audit', description: 'Can clear old audit entries' },

  // Admin permissions
  { key: 'VIEW_ADMINS', label: 'عرض المشرفين', labelEn: 'View Admins', category: 'admin', description: 'Can view admin list' },
  { key: 'MANAGE_ADMINS', label: 'إدارة المشرفين', labelEn: 'Manage Admins', category: 'admin', description: 'Can add/edit/delete admins' },
  { key: 'APPROVE_PENDING', label: 'الموافقة على الطلبات', labelEn: 'Approve Pending', category: 'admin', description: 'Can approve pending entries' },
  { key: 'VIEW_CONFIG', label: 'عرض الإعدادات', labelEn: 'View Config', category: 'admin', description: 'Can view system configuration' },
  { key: 'EDIT_CONFIG', label: 'تعديل الإعدادات', labelEn: 'Edit Config', category: 'admin', description: 'Can edit system configuration' },
  { key: 'VIEW_REPORTS', label: 'عرض التقارير', labelEn: 'View Reports', category: 'admin', description: 'Can view reports and analytics' },
];

// Default permissions for each role
export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map(p => p.key),
  ADMIN: ALL_PERMISSIONS.filter(p =>
    !['MANAGE_ADMINS', 'CLEAR_AUDIT_LOG', 'EDIT_CONFIG'].includes(p.key)
  ).map(p => p.key),
  EDITOR: [
    'VIEW_MEMBERS', 'ADD_MEMBERS', 'EDIT_MEMBERS',
    'EXPORT_DATA', 'VIEW_HISTORY', 'VIEW_BACKUPS',
    'VIEW_AUDIT_LOG', 'VIEW_CONFIG', 'VIEW_REPORTS'
  ],
  VIEWER: [
    'VIEW_MEMBERS', 'EXPORT_DATA', 'VIEW_HISTORY',
    'VIEW_BACKUPS', 'VIEW_AUDIT_LOG', 'VIEW_CONFIG', 'VIEW_REPORTS'
  ],
};

// Role labels and colors
export const ROLE_LABELS: Record<AdminRole, { label: string; labelEn: string; color: string; bgColor: string }> = {
  SUPER_ADMIN: {
    label: 'مدير عام',
    labelEn: 'Super Admin',
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  },
  ADMIN: {
    label: 'مدير',
    labelEn: 'Admin',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100'
  },
  EDITOR: {
    label: 'محرر',
    labelEn: 'Editor',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  VIEWER: {
    label: 'مشاهد',
    labelEn: 'Viewer',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  },
};

// Permission category labels
export const CATEGORY_LABELS: Record<string, { label: string; labelEn: string }> = {
  members: { label: 'الأعضاء', labelEn: 'Members' },
  data: { label: 'البيانات', labelEn: 'Data' },
  history: { label: 'السجل', labelEn: 'History' },
  backup: { label: 'النسخ الاحتياطي', labelEn: 'Backup' },
  audit: { label: 'المراجعة', labelEn: 'Audit' },
  admin: { label: 'الإدارة', labelEn: 'Administration' },
};

/**
 * Get current admin from localStorage
 */
export function getCurrentAdmin(): Admin | null {
  if (typeof window === 'undefined') return null;

  const currentAdminId = localStorage.getItem(storageKeys.currentAdmin);
  if (!currentAdminId) return null;

  const admins = JSON.parse(localStorage.getItem(storageKeys.admins) || '[]') as Admin[];
  return admins.find(a => a.id === currentAdminId && a.isActive) || null;
}

/**
 * Check if current admin has a specific permission
 */
export function hasPermission(permission: string): boolean {
  const admin = getCurrentAdmin();
  if (!admin) return false;

  // Super admin has all permissions
  if (admin.role === 'SUPER_ADMIN') return true;

  return admin.permissions.includes(permission);
}

/**
 * Check if current admin has any of the specified permissions
 */
export function hasAnyPermission(permissions: string[]): boolean {
  const admin = getCurrentAdmin();
  if (!admin) return false;

  // Super admin has all permissions
  if (admin.role === 'SUPER_ADMIN') return true;

  return permissions.some(p => admin.permissions.includes(p));
}

/**
 * Check if current admin has all of the specified permissions
 */
export function hasAllPermissions(permissions: string[]): boolean {
  const admin = getCurrentAdmin();
  if (!admin) return false;

  // Super admin has all permissions
  if (admin.role === 'SUPER_ADMIN') return true;

  return permissions.every(p => admin.permissions.includes(p));
}

/**
 * Set current admin after login
 */
export function setCurrentAdmin(adminId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKeys.currentAdmin, adminId);
}

/**
 * Clear current admin (logout)
 */
export function clearCurrentAdmin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKeys.currentAdmin);
}

/**
 * Validate access code and return admin if valid
 */
export function validateAccessCode(code: string): Admin | null {
  if (typeof window === 'undefined') return null;

  const codes = JSON.parse(localStorage.getItem(storageKeys.adminCodes) || '{}');
  const admins = JSON.parse(localStorage.getItem(storageKeys.admins) || '[]') as Admin[];

  // Find admin with matching code
  for (const [adminId, adminCode] of Object.entries(codes)) {
    if (adminCode === code) {
      const admin = admins.find(a => a.id === adminId && a.isActive);
      if (admin) {
        return admin;
      }
    }
  }

  // Check default admin code from config
  if (code === accessCodeConfig.defaultAdminCode) {
    const superAdmin = admins.find(a => a.role === 'SUPER_ADMIN' && a.isActive);
    return superAdmin || null;
  }

  return null;
}

/**
 * Get permissions grouped by category
 */
export function getPermissionsByCategory(): Record<string, Permission[]> {
  const grouped: Record<string, Permission[]> = {};

  for (const perm of ALL_PERMISSIONS) {
    if (!grouped[perm.category]) {
      grouped[perm.category] = [];
    }
    grouped[perm.category].push(perm);
  }

  return grouped;
}

/**
 * Get permission label by key
 */
export function getPermissionLabel(key: string): string {
  const perm = ALL_PERMISSIONS.find(p => p.key === key);
  return perm?.label || key;
}
