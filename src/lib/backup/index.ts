// ============================================
// Backup Module - Consolidated Entry Point
// ============================================
//
// This module consolidates:
// - src/lib/backup.ts (client-side backup operations)
// - src/lib/backup-service.ts (server-side backup with Prisma)
// - src/lib/services/backup.ts (BackupService class)
//
// Re-exports from submodules for convenience.

// Re-export all types
export type {
  BackupConfig,
  BackupEntry,
  BackupData,
  MemberBackup,
  RestoreResult,
  SchedulerConfig,
  ServiceBackupConfig,
  BackupResult,
  BackupNotificationData,
  GitHubBackupResult,
  DriveExportResult,
  SheetsExportResult,
  BackupProvider,
} from './types';

// Re-export scheduler
export {
  getBackupConfigFromDB,
  saveBackupConfigToDB,
  isBackupNeeded,
  createAutoBackup,
  runBackupIfNeeded,
  cleanupOldBackups,
  getNextBackupTime,
  getBackupStats,
  verifyBackupIntegrity,
  getBackupConfig as getSchedulerConfig,
  updateBackupConfig,
  startBackupScheduler,
  stopBackupScheduler,
} from './scheduler';

// Re-export notifications
export { sendBackupNotification } from './notifications';

// ============================================
// Client-side Backup Operations (from backup.ts)
// Uses API calls, runs in browser
// ============================================

import { logBackupCreate, logBackupRestore, logAudit } from '@/lib/audit';
import { backupSettings } from '@/config/constants';
import type { BackupConfig, BackupEntry } from './types';

// Default backup configuration
const defaultConfig: BackupConfig = {
  enabled: true,
  intervalHours: backupSettings.defaultIntervalHours,
  maxBackups: backupSettings.maxBackups,
  lastBackupTime: null,
  nextBackupTime: null,
};

// Get backup configuration from database (client-side via API)
export async function getBackupConfig(): Promise<BackupConfig> {
  try {
    const res = await fetch('/api/admin/backup-config');
    if (res.ok) {
      const data = await res.json();
      return { ...defaultConfig, ...data.config };
    }
  } catch (error) {
    console.error('Error fetching backup config:', error);
  }
  return defaultConfig;
}

// Save backup configuration to database (client-side via API)
export async function saveBackupConfig(config: Partial<BackupConfig>): Promise<BackupConfig> {
  const currentConfig = await getBackupConfig();
  const newConfig = { ...currentConfig, ...config };

  // Calculate next backup time if enabled
  if (newConfig.enabled && newConfig.intervalHours > 0) {
    const lastTime = newConfig.lastBackupTime ? new Date(newConfig.lastBackupTime) : new Date();
    const nextTime = new Date(lastTime.getTime() + newConfig.intervalHours * 60 * 60 * 1000);
    newConfig.nextBackupTime = nextTime.toISOString();
  } else {
    newConfig.nextBackupTime = null;
  }

  try {
    const res = await fetch('/api/admin/backup-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (res.ok) {
      const data = await res.json();
      return data.config;
    }
  } catch (error) {
    console.error('Error saving backup config:', error);
  }

  return newConfig;
}

// Get all backups from database (client-side via API)
export async function getBackups(): Promise<BackupEntry[]> {
  try {
    const res = await fetch('/api/admin/snapshots');
    if (res.ok) {
      const data = await res.json();
      return (data.snapshots || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        type: s.snapshotType as BackupEntry['type'],
        createdAt: s.createdAt,
        createdBy: s.createdBy,
        createdByName: s.createdByName,
        memberCount: s.memberCount,
        dataSize: s.treeData ? s.treeData.length : 0,
      }));
    }
  } catch (error) {
    console.error('Error fetching backups:', error);
  }
  return [];
}

// Create a backup - Database driven (client-side via API)
export async function createBackup(
  user: { id: string; name: string; role: string } | null,
  options: {
    name?: string;
    description?: string;
    type?: BackupEntry['type'];
    includeConfig?: boolean;
    includeAdmins?: boolean;
  }
): Promise<BackupEntry | null> {
  const {
    name,
    description,
    type = 'MANUAL',
  } = options;

  try {
    const res = await fetch('/api/admin/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || `نسخة ${type === 'AUTO' ? 'تلقائية' : 'يدوية'} - ${new Date().toLocaleDateString('ar-SA')}`,
        description: description || null,
        snapshotType: type,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const backup = data.snapshot;

      const entry: BackupEntry = {
        id: backup.id,
        name: backup.name,
        description: backup.description,
        type: backup.snapshotType as BackupEntry['type'],
        createdAt: backup.createdAt,
        createdBy: backup.createdBy,
        createdByName: backup.createdByName,
        memberCount: backup.memberCount,
        dataSize: backup.treeData ? backup.treeData.length : 0,
      };

      // Update config with last backup time
      await saveBackupConfig({
        lastBackupTime: entry.createdAt,
      });

      // Log audit
      logBackupCreate(user, entry.id, entry.name, entry.memberCount);

      return entry;
    }
  } catch (error) {
    console.error('Error creating backup:', error);
  }

  return null;
}

// Restore from backup (client-side via API)
export async function restoreBackup(
  user: { id: string; name: string; role: string } | null,
  backupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/snapshots/${backupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore' }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      logBackupRestore(user, backupId, data.snapshotName || backupId);
      return { success: true };
    }
    return { success: false, error: data.messageAr || data.message || 'فشلت استعادة النسخة الاحتياطية' };
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, error: 'حدث خطأ أثناء استعادة النسخة الاحتياطية' };
  }
}

// Delete a backup (client-side via API)
export async function deleteBackup(
  user: { id: string; name: string; role: string } | null,
  backupId: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/snapshots/${backupId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      logAudit(user, {
        action: 'BACKUP_DELETE',
        severity: 'WARNING',
        targetType: 'BACKUP',
        targetId: backupId,
        description: `تم حذف النسخة الاحتياطية`,
      });
      return true;
    }
  } catch (error) {
    console.error('Error deleting backup:', error);
  }
  return false;
}

// Download backup as file (client-side)
export async function downloadBackup(
  user: { id: string; name: string; role: string } | null,
  backupId: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const res = await fetch(`/api/admin/snapshots/${backupId}?download=true`);
    if (!res.ok) return false;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Get filename from header if possible
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `alshaye_backup_${backupId}.json`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = decodeURIComponent(match[1]);
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logAudit(user, {
      action: 'BACKUP_DOWNLOAD',
      targetType: 'BACKUP',
      targetId: backupId,
      description: `تم تحميل النسخة الاحتياطية`,
    });

    return true;
  } catch (error) {
    console.error('Error downloading backup:', error);
    return false;
  }
}

// Check if auto backup is needed (client-side)
export async function checkAutoBackup(): Promise<boolean> {
  const config = await getBackupConfig();

  if (!config.enabled || !config.intervalHours) return false;

  const now = new Date();
  const lastBackup = config.lastBackupTime ? new Date(config.lastBackupTime) : null;

  if (!lastBackup) return true;

  const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastBackup >= config.intervalHours;
}

// Run auto backup if needed (client-side)
export async function runAutoBackupIfNeeded(user: { id: string; name: string; role: string } | null): Promise<BackupEntry | null> {
  if (!(await checkAutoBackup())) return null;

  const backup = await createBackup(user, {
    type: 'AUTO',
    description: 'نسخة احتياطية تلقائية حسب الجدولة',
  });

  return backup;
}

/**
 * Start auto backup scheduler (client-side)
 * Runs check once on mount, no setInterval
 */
export function startClientBackupScheduler(user: { id: string; name: string; role: string } | null): void {
  if (typeof window === 'undefined') return;

  // Run once to check if backup is needed (no interval)
  runAutoBackupIfNeeded(user).catch(console.error);

  // Trigger server-side backup check via API
  fetch('/api/backup/check', { method: 'POST' }).catch(() => {
    // Ignore API errors
  });
}

/**
 * Stop backup scheduler (client-side)
 * No-op - scheduler stopped
 */
export function stopClientBackupScheduler(): void {
  // No-op
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// Server-side Backup Operations (from backup-service.ts)
// Uses Prisma directly, runs on server
// ============================================

import { prisma } from '@/lib/prisma';
import type { BackupData as BackupDataType, MemberBackup as MemberBackupType, RestoreResult } from './types';

function generateChecksum(members: MemberBackupType[]): string {
  const data = members.map(m => `${m.id}:${m.firstName}:${m.fatherId || 'null'}`).sort().join('|');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `chk_${Math.abs(hash).toString(16)}_${members.length}`;
}

export async function createFullBackup(): Promise<BackupDataType> {
  const members = await prisma.familyMember.findMany({
    orderBy: { id: 'asc' },
  });

  const memberBackups: MemberBackupType[] = members.map(m => ({
    id: m.id,
    firstName: m.firstName,
    fatherName: m.fatherName,
    grandfatherName: m.grandfatherName,
    greatGrandfatherName: m.greatGrandfatherName,
    familyName: m.familyName,
    fatherId: m.fatherId,
    gender: m.gender,
    birthYear: m.birthYear,
    deathYear: m.deathYear,
    sonsCount: m.sonsCount,
    daughtersCount: m.daughtersCount,
    generation: m.generation,
    branch: m.branch,
    fullNameAr: m.fullNameAr,
    fullNameEn: m.fullNameEn,
    lineageBranchId: m.lineageBranchId,
    lineageBranchName: m.lineageBranchName,
    subBranchId: m.subBranchId,
    subBranchName: m.subBranchName,
    lineagePath: m.lineagePath,
    phone: m.phone,
    city: m.city,
    status: m.status,
    photoUrl: m.photoUrl,
    biography: m.biography,
    occupation: m.occupation,
    email: m.email,
    version: m.version,
    deletedAt: m.deletedAt?.toISOString() || null,
    deletedBy: m.deletedBy,
    deletedReason: m.deletedReason,
  }));

  const checksum = generateChecksum(memberBackups);

  return {
    version: '2.0',
    createdAt: new Date().toISOString(),
    totalMembers: memberBackups.length,
    members: memberBackups,
    checksum,
  };
}

function sortMembersByDependency(members: MemberBackupType[]): MemberBackupType[] {
  const memberMap = new Map<string, MemberBackupType>();
  members.forEach(m => memberMap.set(m.id, m));

  const sorted: MemberBackupType[] = [];
  const visited = new Set<string>();
  const inProgress = new Set<string>();

  function visit(member: MemberBackupType) {
    if (visited.has(member.id)) return;
    if (inProgress.has(member.id)) {
      visited.add(member.id);
      sorted.push(member);
      return;
    }

    inProgress.add(member.id);

    if (member.fatherId && memberMap.has(member.fatherId)) {
      visit(memberMap.get(member.fatherId)!);
    }

    inProgress.delete(member.id);
    visited.add(member.id);
    sorted.push(member);
  }

  for (const member of members) {
    visit(member);
  }

  return sorted;
}

export async function restoreFromBackup(
  backupData: BackupDataType,
  userId: string,
  userName: string
): Promise<RestoreResult> {
  const errors: string[] = [];

  if (!backupData.members || !Array.isArray(backupData.members)) {
    return {
      success: false,
      restoredCount: 0,
      expectedCount: 0,
      errors: ['Invalid backup data: members array is missing'],
    };
  }

  const expectedCount = backupData.members.length;

  if (expectedCount === 0) {
    return {
      success: false,
      restoredCount: 0,
      expectedCount: 0,
      errors: ['Cannot restore empty backup'],
    };
  }

  const currentMembers = await prisma.familyMember.findMany();

  const preRestoreSnapshot = await prisma.snapshot.create({
    data: {
      name: `Pre-Restore Safety Backup`,
      description: `Automatic safety backup before restore operation - ${currentMembers.length} members preserved`,
      treeData: JSON.stringify(currentMembers),
      memberCount: currentMembers.length,
      createdBy: userId,
      createdByName: userName,
      snapshotType: 'PRE_RESTORE',
    },
  });

  const sortedMembers = sortMembersByDependency(backupData.members);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.familyMember.deleteMany({});

      for (const member of sortedMembers) {
        await tx.familyMember.create({
          data: {
            id: member.id,
            firstName: member.firstName,
            fatherName: member.fatherName ?? undefined,
            grandfatherName: member.grandfatherName ?? undefined,
            greatGrandfatherName: member.greatGrandfatherName ?? undefined,
            familyName: member.familyName ?? undefined,
            fatherId: member.fatherId ?? undefined,
            gender: member.gender,
            birthYear: member.birthYear ?? undefined,
            deathYear: member.deathYear ?? undefined,
            sonsCount: member.sonsCount || 0,
            daughtersCount: member.daughtersCount || 0,
            generation: member.generation,
            branch: member.branch ?? undefined,
            fullNameAr: member.fullNameAr ?? undefined,
            fullNameEn: member.fullNameEn ?? undefined,
            lineageBranchId: member.lineageBranchId ?? undefined,
            lineageBranchName: member.lineageBranchName ?? undefined,
            subBranchId: member.subBranchId ?? undefined,
            subBranchName: member.subBranchName ?? undefined,
            lineagePath: member.lineagePath ?? undefined,
            phone: member.phone ?? undefined,
            city: member.city ?? undefined,
            status: member.status || 'Living',
            photoUrl: member.photoUrl ?? undefined,
            biography: member.biography ?? undefined,
            occupation: member.occupation ?? undefined,
            email: member.email ?? undefined,
            version: member.version || 1,
            deletedAt: member.deletedAt ? new Date(member.deletedAt) : null,
            deletedBy: member.deletedBy ?? undefined,
            deletedReason: member.deletedReason ?? undefined,
          },
        });
      }

      const finalCount = await tx.familyMember.count();

      if (finalCount !== expectedCount) {
        throw new Error(`Member count mismatch: expected ${expectedCount}, got ${finalCount}. Rolling back.`);
      }
    }, {
      timeout: 60000,
    });

    const verifyCount = await prisma.familyMember.count();

    if (verifyCount !== expectedCount) {
      errors.push(`Post-transaction verification failed: expected ${expectedCount}, found ${verifyCount}`);
      return {
        success: false,
        restoredCount: verifyCount,
        expectedCount,
        errors,
        preRestoreSnapshotId: preRestoreSnapshot.id,
      };
    }

    return {
      success: true,
      restoredCount: verifyCount,
      expectedCount,
      errors: [],
      preRestoreSnapshotId: preRestoreSnapshot.id,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during restore';
    errors.push(errorMessage);

    console.error('Restore failed, attempting to recover from pre-restore backup:', error);

    try {
      const preRestoreData = JSON.parse(preRestoreSnapshot.treeData);

      await prisma.$transaction(async (tx) => {
        await tx.familyMember.deleteMany({});

        for (const member of preRestoreData) {
          const { createdAt, updatedAt, ...memberData } = member;
          await tx.familyMember.create({
            data: {
              ...memberData,
              sonsCount: memberData.sonsCount || 0,
              daughtersCount: memberData.daughtersCount || 0,
            },
          });
        }
      });

      errors.push('Data restored to pre-restore state after failure');
    } catch (recoveryError) {
      errors.push(`CRITICAL: Recovery also failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown'}`);
    }

    return {
      success: false,
      restoredCount: 0,
      expectedCount,
      errors,
      preRestoreSnapshotId: preRestoreSnapshot.id,
    };
  }
}

export function generateCSV(members: MemberBackupType[]): string {
  const headers = [
    'الرقم',
    'الاسم الأول',
    'اسم الأب',
    'اسم الجد',
    'اسم الجد الأعلى',
    'العائلة',
    'رقم الأب',
    'الجنس',
    'سنة الميلاد',
    'سنة الوفاة',
    'عدد الأبناء',
    'عدد البنات',
    'الجيل',
    'الفرع',
    'الاسم الكامل بالعربي',
    'الاسم الكامل بالانجليزي',
    'الهاتف',
    'المدينة',
    'الحالة',
    'المهنة',
    'البريد الإلكتروني',
  ];

  const rows = members.map(m => [
    m.id,
    m.firstName,
    m.fatherName || '',
    m.grandfatherName || '',
    m.greatGrandfatherName || '',
    m.familyName || '',
    m.fatherId || '',
    m.gender?.toUpperCase() === 'MALE' ? 'ذكر' : 'أنثى',
    m.birthYear?.toString() || '',
    m.deathYear?.toString() || '',
    m.sonsCount.toString(),
    m.daughtersCount.toString(),
    m.generation.toString(),
    m.branch || '',
    m.fullNameAr || '',
    m.fullNameEn || '',
    m.phone || '',
    m.city || '',
    m.status === 'Deceased' ? 'متوفي' : 'على قيد الحياة',
    m.occupation || '',
    m.email || '',
  ]);

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export async function createDailyCSVBackup(): Promise<{ csv: string; memberCount: number; date: string }> {
  const backup = await createFullBackup();
  const csv = generateCSV(backup.members);
  const date = new Date().toISOString().split('T')[0];

  return {
    csv,
    memberCount: backup.totalMembers,
    date,
  };
}

// ============================================
// BackupService class (from services/backup.ts)
// ============================================

import { emailService } from '@/lib/services/email';
import type { ServiceBackupConfig, BackupResult } from './types';

const DEFAULT_SERVICE_CONFIG: ServiceBackupConfig = {
  enabled: true,
  schedule: '0 3 * * *', // Daily at 3 AM
  retentionDays: 30,
  notifyOnSuccess: false,
  notifyOnFailure: true,
};

export class BackupService {
  private config: ServiceBackupConfig = DEFAULT_SERVICE_CONFIG;

  async getConfig(): Promise<ServiceBackupConfig> {
    try {
      const job = await prisma.scheduledJob?.findUnique({
        where: { name: 'auto-backup' },
      });

      if (job?.jobConfig) {
        const config = JSON.parse(job.jobConfig);
        this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
      }
    } catch {
      // Use default config
    }

    return this.config;
  }

  async setConfig(config: Partial<ServiceBackupConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    try {
      await prisma.scheduledJob?.upsert({
        where: { name: 'auto-backup' },
        update: {
          cronExpression: this.config.schedule,
          isEnabled: this.config.enabled,
          jobConfig: JSON.stringify(this.config),
        },
        create: {
          name: 'auto-backup',
          description: 'Automatic daily backup of family tree data',
          cronExpression: this.config.schedule,
          timezone: 'Asia/Riyadh',
          jobType: 'BACKUP',
          isEnabled: this.config.enabled,
          jobConfig: JSON.stringify(this.config),
        },
      });
    } catch {
      // Database model might not exist yet
    }
  }

  async createBackup(
    name?: string,
    description?: string,
    type: 'MANUAL' | 'AUTO_BACKUP' | 'PRE_IMPORT' = 'AUTO_BACKUP'
  ): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      // Get source member count before backup
      const expectedCount = await prisma.familyMember.count();

      // Get all family members
      const members = await prisma.familyMember.findMany({
        orderBy: { id: 'asc' },
      });

      const treeDataJson = JSON.stringify(members);
      const actualCount = members.length;

      // Verify backup integrity
      const verified = expectedCount === actualCount;

      // Calculate backup size
      const backupSize = Buffer.byteLength(treeDataJson, 'utf8');

      // Check for size anomaly - get last 5 backups for comparison
      const recentBackups = await prisma.snapshot.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { treeData: true },
      });

      let sizeWarning: string | undefined;
      let sizeWarningAr: string | undefined;

      if (recentBackups.length > 0) {
        const recentSizes = recentBackups.map(b => Buffer.byteLength(b.treeData, 'utf8'));
        const averageSize = recentSizes.reduce((a, b) => a + b, 0) / recentSizes.length;

        if (backupSize < averageSize * 0.5) {
          sizeWarning = 'Warning: backup size is significantly smaller than usual';
          sizeWarningAr = 'تحذير: حجم النسخة الاحتياطية أصغر بكثير من المعتاد';
        }
      }

      // Create snapshot name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotName = name || `Backup_${timestamp}`;

      // Create snapshot
      const snapshot = await prisma.snapshot.create({
        data: {
          name: snapshotName,
          description: description || `Automatic backup - ${actualCount} members`,
          treeData: treeDataJson,
          memberCount: actualCount,
          createdBy: 'SYSTEM',
          createdByName: 'Automated Backup',
          snapshotType: type,
        },
      });

      const duration = Date.now() - startTime;

      // Update job status
      try {
        await prisma.scheduledJob?.update({
          where: { name: 'auto-backup' },
          data: {
            lastRunAt: new Date(),
            lastRunStatus: 'SUCCESS',
            lastRunDuration: duration,
            lastRunError: null,
          },
        });
      } catch {
        // Ignore
      }

      // Send notification if configured
      if (this.config.notifyOnSuccess && this.config.notifyEmail) {
        await emailService.sendTemplateEmail(
          this.config.notifyEmail,
          'backup_complete',
          {
            snapshotName: snapshot.name,
            memberCount: actualCount,
            date: new Date().toLocaleDateString('ar-SA'),
          }
        );
      }

      return {
        success: true,
        snapshotId: snapshot.id,
        snapshotName: snapshot.name,
        memberCount: actualCount,
        duration,
        verified,
        expectedCount,
        actualCount,
        backupSize,
        ...(sizeWarning && { sizeWarning }),
        ...(sizeWarningAr && { sizeWarningAr }),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update job status
      try {
        await prisma.scheduledJob?.update({
          where: { name: 'auto-backup' },
          data: {
            lastRunAt: new Date(),
            lastRunStatus: 'FAILED',
            lastRunError: errorMessage,
          },
        });
      } catch {
        // Ignore
      }

      // Send failure notification
      if (this.config.notifyOnFailure && this.config.notifyEmail) {
        await emailService.sendEmail({
          to: this.config.notifyEmail,
          subject: '⚠️ فشل النسخ الاحتياطي - Backup Failed',
          html: `
            <div dir="rtl" style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #e74c3c;">فشل النسخ الاحتياطي التلقائي</h2>
              <p>حدث خطأ أثناء إنشاء النسخة الاحتياطية:</p>
              <p style="background: #fef2f2; padding: 15px; border-radius: 8px; color: #991b1b;">
                ${errorMessage}
              </p>
              <p>التاريخ: ${new Date().toLocaleString('ar-SA')}</p>
            </div>
          `,
          text: `Backup failed: ${errorMessage}`,
        });
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async cleanupOldBackups(): Promise<{ deleted: number }> {
    const config = await this.getConfig();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

    const result = await prisma.snapshot.deleteMany({
      where: {
        snapshotType: 'AUTO_BACKUP',
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return { deleted: result.count };
  }

  async listBackups(limit: number = 20): Promise<unknown[]> {
    const snapshots = await prisma.snapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        memberCount: true,
        snapshotType: true,
        createdAt: true,
        createdByName: true,
      },
    });

    return snapshots;
  }

  async restoreBackup(snapshotId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const snapshot = await prisma.snapshot.findUnique({
        where: { id: snapshotId },
      });

      if (!snapshot) {
        return { success: false, error: 'Snapshot not found' };
      }

      // Create a pre-restore backup first
      await this.createBackup(
        `Pre-Restore_${new Date().toISOString().replace(/[:.]/g, '-')}`,
        `Automatic backup before restoring snapshot: ${snapshot.name}`,
        'PRE_IMPORT'
      );

      // Parse the tree data
      const members = JSON.parse(snapshot.treeData) as Record<string, unknown>[];

      // Delete all current members and re-create from snapshot
      await prisma.$transaction(async (tx) => {
        await tx.familyMember.deleteMany({});

        for (const member of members) {
          await tx.familyMember.create({
            // eslint-disable-next-line
            data: member as any,
          });
        }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const backupService = new BackupService();

// ============================================
// CRON JOB RUNNER
// ============================================

export async function runScheduledBackup(): Promise<BackupResult> {
  const config = await backupService.getConfig();

  if (!config.enabled) {
    return { success: false, error: 'Backup is disabled' };
  }

  const result = await backupService.createBackup();

  if (result.success) {
    await backupService.cleanupOldBackups();
  }

  return result;
}
