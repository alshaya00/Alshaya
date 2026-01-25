// Audit Log Service - Hybrid server/client implementation
// - Server-side: Use logAuditToDb from db-audit.ts (direct Prisma)
// - Client-side: Use these API-based functions with auth headers

// Re-export server-side functions for API routes
export { logAuditToDb, getAuditLogsFromDb } from './db-audit';

export type AuditAction =
  | 'MEMBER_CREATE'
  | 'MEMBER_UPDATE'
  | 'MEMBER_DELETE'
  | 'MEMBER_VIEW'
  | 'MEMBER_MERGE'
  | 'MEMBER_MERGE_BLOCKED'
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
  | 'DATA_CLEANUP'
  | 'DATA_CLEANUP_REVERT'
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
  page?: number;
  limit?: number;
}

// Client-side function to get auth header from storage
function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('alshaye_token') || sessionStorage.getItem('alshaye_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

// Get all audit logs from database via API (CLIENT-SIDE ONLY)
export async function getAuditLogs(filter?: AuditLogFilter): Promise<AuditLogEntry[]> {
  try {
    const params = new URLSearchParams();
    if (filter) {
      if (filter.action) params.set('action', filter.action);
      if (filter.userId) params.set('userId', filter.userId);
      if (filter.targetType) params.set('targetType', filter.targetType);
      if (filter.targetId) params.set('targetId', filter.targetId);
      if (filter.severity) params.set('severity', filter.severity);
      if (filter.startDate) params.set('startDate', filter.startDate);
      if (filter.endDate) params.set('endDate', filter.endDate);
      if (filter.success !== undefined) params.set('success', String(filter.success));
      if (filter.page) params.set('page', String(filter.page));
      if (filter.limit) params.set('limit', String(filter.limit));
    }

    const res = await fetch(`/api/admin/audit?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      console.error('Failed to fetch audit logs');
      return [];
    }

    const data = await res.json();
    return data.logs || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

// Log audit entry via API (CLIENT-SIDE ONLY)
export async function logAuditAsync(
  user: { id: string; name: string; role: string } | null,
  params: {
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
  }
): Promise<AuditLogEntry | null> {
  const effectiveUser = user || { id: 'system', name: 'النظام', role: 'SYSTEM' };

  const entry = {
    action: params.action,
    severity: params.severity || 'INFO',
    userId: effectiveUser.id,
    userName: effectiveUser.name,
    userRole: effectiveUser.role,
    targetType: params.targetType,
    targetId: params.targetId || null,
    targetName: params.targetName || null,
    description: params.description,
    details: params.details || {},
    previousState: params.previousState || null,
    newState: params.newState || null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    success: params.success !== false,
    errorMessage: params.errorMessage || null,
  };

  try {
    const res = await fetch('/api/admin/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(entry),
    });

    if (!res.ok) {
      console.error('Failed to save audit log');
      return null;
    }

    const data = await res.json();
    return data.log || null;
  } catch (error) {
    console.error('Error saving audit log:', error);
    return null;
  }
}

// Synchronous wrapper for backward compatibility (fires and forgets) - CLIENT-SIDE ONLY
export function logAudit(
  user: { id: string; name: string; role: string } | null,
  params: {
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
  }
): void {
  logAuditAsync(user, params).catch(console.error);
}

// Helper functions for common audit actions (CLIENT-SIDE ONLY)
export function logMemberCreate(user: { id: string; name: string; role: string } | null, member: Record<string, unknown>): void {
  logAudit(user, {
    action: 'MEMBER_CREATE',
    targetType: 'MEMBER',
    targetId: member.id as string,
    targetName: (member.fullNameAr || member.firstName) as string,
    description: `تم إنشاء عضو جديد: ${member.firstName}`,
    newState: member,
  });
}

export function logMemberUpdate(
  user: { id: string; name: string; role: string } | null,
  memberId: string,
  memberName: string,
  previousState: Record<string, unknown>,
  newState: Record<string, unknown>,
  changedFields: string[]
): void {
  logAudit(user, {
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

export function logMemberDelete(user: { id: string; name: string; role: string } | null, memberId: string, memberName: string, memberData: Record<string, unknown>): void {
  logAudit(user, {
    action: 'MEMBER_DELETE',
    severity: 'WARNING',
    targetType: 'MEMBER',
    targetId: memberId,
    targetName: memberName,
    description: `تم حذف العضو: ${memberName}`,
    previousState: memberData,
  });
}

export function logBackupCreate(user: { id: string; name: string; role: string } | null, backupId: string, backupName: string, memberCount: number): void {
  logAudit(user, {
    action: 'BACKUP_CREATE',
    targetType: 'BACKUP',
    targetId: backupId,
    targetName: backupName,
    description: `تم إنشاء نسخة احتياطية: ${backupName}`,
    details: { memberCount },
  });
}

export function logBackupRestore(user: { id: string; name: string; role: string } | null, backupId: string, backupName: string): void {
  logAudit(user, {
    action: 'BACKUP_RESTORE',
    severity: 'WARNING',
    targetType: 'BACKUP',
    targetId: backupId,
    targetName: backupName,
    description: `تم استعادة النسخة الاحتياطية: ${backupName}`,
  });
}

export function logConfigUpdate(user: { id: string; name: string; role: string } | null, setting: string, oldValue: unknown, newValue: unknown): void {
  logAudit(user, {
    action: 'CONFIG_UPDATE',
    targetType: 'CONFIG',
    targetId: setting,
    targetName: setting,
    description: `تم تعديل الإعداد: ${setting}`,
    previousState: { [setting]: oldValue },
    newState: { [setting]: newValue },
  });
}

export function logAdminLogin(user: { id: string; name: string; role: string } | null, adminId: string, adminName: string, success: boolean, errorMessage?: string): void {
  logAudit(user, {
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

export function logExportData(user: { id: string; name: string; role: string } | null, format: string, memberCount: number, filters?: Record<string, unknown>): void {
  logAudit(user, {
    action: 'EXPORT_DATA',
    targetType: 'EXPORT',
    description: `تم تصدير البيانات بتنسيق ${format}`,
    details: { format, memberCount, filters },
  });
}

export function logImportData(user: { id: string; name: string; role: string } | null, fileName: string, recordCount: number, successCount: number, errorCount: number): void {
  logAudit(user, {
    action: 'IMPORT_DATA',
    severity: errorCount > 0 ? 'WARNING' : 'INFO',
    targetType: 'IMPORT',
    targetName: fileName,
    description: `تم استيراد البيانات من ${fileName}`,
    details: { recordCount, successCount, errorCount },
    success: errorCount === 0,
  });
}

// Get audit log statistics from API (CLIENT-SIDE ONLY)
export async function getAuditStats(): Promise<{
  total: number;
  today: number;
  thisWeek: number;
  byAction: Record<string, number>;
  bySeverity: Record<string, number>;
  byUser: Record<string, number>;
}> {
  try {
    const res = await fetch('/api/admin/audit/stats', {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      console.error('Failed to fetch audit stats');
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        byAction: {},
        bySeverity: {},
        byUser: {},
      };
    }

    const data = await res.json();
    return data.stats || {
      total: 0,
      today: 0,
      thisWeek: 0,
      byAction: {},
      bySeverity: {},
      byUser: {},
    };
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    return {
      total: 0,
      today: 0,
      thisWeek: 0,
      byAction: {},
      bySeverity: {},
      byUser: {},
    };
  }
}

// Clear old audit logs via API (CLIENT-SIDE ONLY)
export async function cleanupAuditLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const res = await fetch('/api/admin/audit/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ daysToKeep }),
    });

    if (!res.ok) {
      console.error('Failed to cleanup audit logs');
      return 0;
    }

    const data = await res.json();
    return data.deletedCount || 0;
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    return 0;
  }
}
