// Audit Log Service - Comprehensive tracking for all system actions
// This service tracks every action in the system for traceability

export type AuditAction =
  | 'MEMBER_CREATE'
  | 'MEMBER_UPDATE'
  | 'MEMBER_DELETE'
  | 'MEMBER_VIEW'
  | 'PARENT_CHANGE'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'BACKUP_DELETE'
  | 'BACKUP_DOWNLOAD'
  | 'CONFIG_UPDATE'
  | 'ADMIN_CREATE'
  | 'ADMIN_UPDATE'
  | 'ADMIN_DELETE'
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'BRANCH_LINK_CREATE'
  | 'BRANCH_LINK_UPDATE'
  | 'BRANCH_LINK_DELETE'
  | 'PENDING_APPROVE'
  | 'PENDING_REJECT'
  | 'DUPLICATE_RESOLVE'
  | 'SYSTEM_CLEANUP'
  | 'INTEGRITY_CHECK';

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  userId: string;
  userName: string;
  userRole: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  description: string;
  details: Record<string, unknown>;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  success: boolean;
  errorMessage: string | null;
}

export interface AuditLogFilter {
  action?: AuditAction;
  userId?: string;
  targetType?: string;
  targetId?: string;
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  success?: boolean;
}

import { storageKeys } from '@/config/storage-keys';
import { paginationSettings } from '@/config/constants';

const AUDIT_LOG_KEY = storageKeys.auditLog;
const MAX_AUDIT_ENTRIES = paginationSettings.maxAuditEntries;

// Get current admin info
function getCurrentAdmin(): { id: string; name: string; role: string } {
  try {
    const admins = JSON.parse(localStorage.getItem(storageKeys.admins) || '[]');
    const authStatus = localStorage.getItem(storageKeys.adminAuth);
    if (authStatus === 'true' && admins.length > 0) {
      return {
        id: admins[0].id || 'admin',
        name: admins[0].name || 'المدير',
        role: admins[0].role || 'ADMIN',
      };
    }
  } catch {
    // Ignore
  }
  return { id: 'system', name: 'النظام', role: 'SYSTEM' };
}

// SECURITY: Generate unique ID using Web Crypto API
function generateId(): string {
  const array = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  return `audit_${Date.now()}_${hex}`;
}

// Get all audit logs
export function getAuditLogs(filter?: AuditLogFilter): AuditLogEntry[] {
  try {
    let logs: AuditLogEntry[] = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');

    if (filter) {
      if (filter.action) {
        logs = logs.filter((l) => l.action === filter.action);
      }
      if (filter.userId) {
        logs = logs.filter((l) => l.userId === filter.userId);
      }
      if (filter.targetType) {
        logs = logs.filter((l) => l.targetType === filter.targetType);
      }
      if (filter.targetId) {
        logs = logs.filter((l) => l.targetId === filter.targetId);
      }
      if (filter.severity) {
        logs = logs.filter((l) => l.severity === filter.severity);
      }
      if (filter.startDate) {
        logs = logs.filter((l) => new Date(l.timestamp) >= new Date(filter.startDate!));
      }
      if (filter.endDate) {
        logs = logs.filter((l) => new Date(l.timestamp) <= new Date(filter.endDate!));
      }
      if (filter.success !== undefined) {
        logs = logs.filter((l) => l.success === filter.success);
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

// Save audit log entry
export function logAudit(params: {
  action: AuditAction;
  severity?: AuditSeverity;
  targetType: string;
  targetId?: string | null;
  targetName?: string | null;
  description: string;
  details?: Record<string, unknown>;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  success?: boolean;
  errorMessage?: string | null;
}): AuditLogEntry {
  const admin = getCurrentAdmin();

  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    action: params.action,
    severity: params.severity || 'INFO',
    userId: admin.id,
    userName: admin.name,
    userRole: admin.role,
    targetType: params.targetType,
    targetId: params.targetId || null,
    targetName: params.targetName || null,
    description: params.description,
    details: params.details || {},
    previousState: params.previousState || null,
    newState: params.newState || null,
    ipAddress: null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    sessionId: localStorage.getItem(storageKeys.sessionId),
    success: params.success !== false,
    errorMessage: params.errorMessage || null,
  };

  try {
    const logs = getAuditLogs();
    logs.unshift(entry);

    // Keep only the last MAX_AUDIT_ENTRIES
    const trimmedLogs = logs.slice(0, MAX_AUDIT_ENTRIES);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLogs));
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }

  return entry;
}

// Helper functions for common audit actions
export function logMemberCreate(member: Record<string, unknown>): void {
  logAudit({
    action: 'MEMBER_CREATE',
    targetType: 'MEMBER',
    targetId: member.id as string,
    targetName: (member.fullNameAr || member.firstName) as string,
    description: `تم إنشاء عضو جديد: ${member.firstName}`,
    newState: member,
  });
}

export function logMemberUpdate(
  memberId: string,
  memberName: string,
  previousState: Record<string, unknown>,
  newState: Record<string, unknown>,
  changedFields: string[]
): void {
  logAudit({
    action: 'MEMBER_UPDATE',
    targetType: 'MEMBER',
    targetId: memberId,
    targetName: memberName,
    description: `تم تعديل العضو: ${memberName} - الحقول: ${changedFields.join(', ')}`,
    details: { changedFields },
    previousState,
    newState,
  });
}

export function logMemberDelete(memberId: string, memberName: string, memberData: Record<string, unknown>): void {
  logAudit({
    action: 'MEMBER_DELETE',
    severity: 'WARNING',
    targetType: 'MEMBER',
    targetId: memberId,
    targetName: memberName,
    description: `تم حذف العضو: ${memberName}`,
    previousState: memberData,
  });
}

export function logBackupCreate(backupId: string, backupName: string, memberCount: number): void {
  logAudit({
    action: 'BACKUP_CREATE',
    targetType: 'BACKUP',
    targetId: backupId,
    targetName: backupName,
    description: `تم إنشاء نسخة احتياطية: ${backupName}`,
    details: { memberCount },
  });
}

export function logBackupRestore(backupId: string, backupName: string): void {
  logAudit({
    action: 'BACKUP_RESTORE',
    severity: 'WARNING',
    targetType: 'BACKUP',
    targetId: backupId,
    targetName: backupName,
    description: `تم استعادة النسخة الاحتياطية: ${backupName}`,
  });
}

export function logConfigUpdate(setting: string, oldValue: unknown, newValue: unknown): void {
  logAudit({
    action: 'CONFIG_UPDATE',
    targetType: 'CONFIG',
    targetId: setting,
    targetName: setting,
    description: `تم تعديل الإعداد: ${setting}`,
    previousState: { [setting]: oldValue },
    newState: { [setting]: newValue },
  });
}

export function logAdminLogin(adminId: string, adminName: string, success: boolean, errorMessage?: string): void {
  logAudit({
    action: 'ADMIN_LOGIN',
    severity: success ? 'INFO' : 'WARNING',
    targetType: 'ADMIN',
    targetId: adminId,
    targetName: adminName,
    description: success ? `تم تسجيل دخول: ${adminName}` : `فشل تسجيل الدخول: ${adminName}`,
    success,
    errorMessage,
  });
}

export function logExportData(format: string, memberCount: number, filters?: Record<string, unknown>): void {
  logAudit({
    action: 'EXPORT_DATA',
    targetType: 'EXPORT',
    description: `تم تصدير البيانات بتنسيق ${format}`,
    details: { format, memberCount, filters },
  });
}

export function logImportData(fileName: string, recordCount: number, successCount: number, errorCount: number): void {
  logAudit({
    action: 'IMPORT_DATA',
    severity: errorCount > 0 ? 'WARNING' : 'INFO',
    targetType: 'IMPORT',
    targetName: fileName,
    description: `تم استيراد البيانات من ${fileName}`,
    details: { recordCount, successCount, errorCount },
    success: errorCount === 0,
  });
}

// Get audit log statistics
export function getAuditStats(): {
  total: number;
  today: number;
  thisWeek: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  byUser: Record<string, number>;
} {
  const logs = getAuditLogs();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const byAction: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  let today = 0;
  let thisWeek = 0;

  logs.forEach((log) => {
    const logDate = new Date(log.timestamp);
    if (logDate >= todayStart) today++;
    if (logDate >= weekStart) thisWeek++;

    byAction[log.action] = (byAction[log.action] || 0) + 1;
    bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
    byUser[log.userName] = (byUser[log.userName] || 0) + 1;
  });

  return {
    total: logs.length,
    today,
    thisWeek,
    byAction,
    bySeverity,
    byUser,
  };
}

// Clear old audit logs (keep last N days)
export function cleanupAuditLogs(daysToKeep: number = 90): number {
  const logs = getAuditLogs();
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const filteredLogs = logs.filter((l) => new Date(l.timestamp) >= cutoffDate);
  const deletedCount = logs.length - filteredLogs.length;

  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(filteredLogs));

  if (deletedCount > 0) {
    logAudit({
      action: 'SYSTEM_CLEANUP',
      targetType: 'AUDIT_LOG',
      description: `تم حذف ${deletedCount} سجل قديم من سجل المراجعة`,
      details: { deletedCount, daysToKeep },
    });
  }

  return deletedCount;
}
