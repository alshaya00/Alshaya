// Backup Service - Automatic and manual backup management
// This service handles all backup operations with configurable intervals

import { logBackupCreate, logBackupRestore, logAudit } from './audit';
import { storageKeys } from '@/config/storage-keys';
import { backupSettings } from '@/config/constants';

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  maxBackups: number;
  lastBackupTime: string | null;
  nextBackupTime: string | null;
}

export interface BackupEntry {
  id: string;
  name: string;
  description: string | null;
  type: 'MANUAL' | 'AUTO' | 'PRE_IMPORT' | 'PRE_RESTORE';
  createdAt: string;
  createdBy: string;
  createdByName: string;
  memberCount: number;
  dataSize: number;
  data: string; // JSON stringified data
  checksum: string;
}

const BACKUP_CONFIG_KEY = storageKeys.backupConfig;
const BACKUPS_KEY = storageKeys.backups;
const BACKUP_TIMER_KEY = storageKeys.backupTimer;

// Default backup configuration from centralized config
const defaultConfig: BackupConfig = {
  enabled: true,
  intervalHours: backupSettings.defaultIntervalHours,
  maxBackups: backupSettings.maxBackups,
  lastBackupTime: null,
  nextBackupTime: null,
};

// Get backup configuration
export function getBackupConfig(): BackupConfig {
  try {
    const stored = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (stored) {
      return { ...defaultConfig, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore
  }
  return defaultConfig;
}

// Save backup configuration
export function saveBackupConfig(config: Partial<BackupConfig>): BackupConfig {
  const currentConfig = getBackupConfig();
  const newConfig = { ...currentConfig, ...config };

  // Calculate next backup time if enabled
  if (newConfig.enabled && newConfig.intervalHours > 0) {
    const lastTime = newConfig.lastBackupTime ? new Date(newConfig.lastBackupTime) : new Date();
    const nextTime = new Date(lastTime.getTime() + newConfig.intervalHours * 60 * 60 * 1000);
    newConfig.nextBackupTime = nextTime.toISOString();
  } else {
    newConfig.nextBackupTime = null;
  }

  localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(newConfig));
  return newConfig;
}

// Get all backups
export function getBackups(): BackupEntry[] {
  try {
    return JSON.parse(localStorage.getItem(BACKUPS_KEY) || '[]');
  } catch {
    return [];
  }
}

// Generate simple checksum
function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Create a backup
export async function createBackup(options: {
  name?: string;
  description?: string;
  type?: BackupEntry['type'];
  includeConfig?: boolean;
  includeAdmins?: boolean;
}): Promise<BackupEntry> {
  const {
    name,
    description,
    type = 'MANUAL',
    includeConfig = true,
    includeAdmins = true,
  } = options;

  // Fetch current data
  let members: unknown[] = [];
  try {
    const res = await fetch('/api/members');
    const data = await res.json();
    members = data.members || [];
  } catch {
    // Use localStorage fallback
    const stored = localStorage.getItem(storageKeys.familyData);
    if (stored) {
      members = JSON.parse(stored);
    }
  }

  const backupData: Record<string, unknown> = {
    version: '2.0',
    createdAt: new Date().toISOString(),
    members,
  };

  if (includeConfig) {
    backupData.config = JSON.parse(localStorage.getItem(storageKeys.systemConfig) || '{}');
  }

  if (includeAdmins) {
    backupData.admins = JSON.parse(localStorage.getItem(storageKeys.admins) || '[]');
  }

  // Include audit logs in backup
  backupData.auditLogs = JSON.parse(localStorage.getItem(storageKeys.auditLog) || '[]').slice(0, 1000);

  const dataString = JSON.stringify(backupData);
  const admin = getCurrentAdmin();

  const backup: BackupEntry = {
    id: `backup_${Date.now()}`,
    name: name || `نسخة ${type === 'AUTO' ? 'تلقائية' : 'يدوية'} - ${new Date().toLocaleDateString('ar-SA')}`,
    description: description || null,
    type,
    createdAt: new Date().toISOString(),
    createdBy: admin.id,
    createdByName: admin.name,
    memberCount: members.length,
    dataSize: dataString.length,
    data: dataString,
    checksum: generateChecksum(dataString),
  };

  // Save backup
  const backups = getBackups();
  backups.unshift(backup);

  // Keep only maxBackups
  const config = getBackupConfig();
  const trimmedBackups = backups.slice(0, config.maxBackups);
  localStorage.setItem(BACKUPS_KEY, JSON.stringify(trimmedBackups));

  // Update config with last backup time
  saveBackupConfig({
    lastBackupTime: backup.createdAt,
  });

  // Log audit
  logBackupCreate(backup.id, backup.name, backup.memberCount);

  return backup;
}

// Restore from backup
export async function restoreBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
  const backups = getBackups();
  const backup = backups.find((b) => b.id === backupId);

  if (!backup) {
    return { success: false, error: 'النسخة الاحتياطية غير موجودة' };
  }

  try {
    // Verify checksum
    const currentChecksum = generateChecksum(backup.data);
    if (currentChecksum !== backup.checksum) {
      return { success: false, error: 'فشل التحقق من سلامة النسخة الاحتياطية' };
    }

    // Create a pre-restore backup first
    await createBackup({
      name: `نسخة قبل الاستعادة - ${new Date().toLocaleDateString('ar-SA')}`,
      description: `تم إنشاؤها تلقائياً قبل استعادة: ${backup.name}`,
      type: 'PRE_RESTORE',
    });

    // Parse and restore data
    const data = JSON.parse(backup.data);

    // Restore config
    if (data.config) {
      localStorage.setItem(storageKeys.systemConfig, JSON.stringify(data.config));
    }

    // Restore admins
    if (data.admins) {
      localStorage.setItem(storageKeys.admins, JSON.stringify(data.admins));
    }

    // Log restore action
    logBackupRestore(backup.id, backup.name);

    return { success: true };
  } catch (error) {
    return { success: false, error: 'حدث خطأ أثناء استعادة النسخة الاحتياطية' };
  }
}

// Delete a backup
export function deleteBackup(backupId: string): boolean {
  const backups = getBackups();
  const backup = backups.find((b) => b.id === backupId);

  if (!backup) return false;

  const filteredBackups = backups.filter((b) => b.id !== backupId);
  localStorage.setItem(BACKUPS_KEY, JSON.stringify(filteredBackups));

  logAudit({
    action: 'BACKUP_DELETE',
    severity: 'WARNING',
    targetType: 'BACKUP',
    targetId: backupId,
    targetName: backup.name,
    description: `تم حذف النسخة الاحتياطية: ${backup.name}`,
  });

  return true;
}

// Download backup as file
export function downloadBackup(backupId: string): boolean {
  const backups = getBackups();
  const backup = backups.find((b) => b.id === backupId);

  if (!backup) return false;

  const blob = new Blob([backup.data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alshaye_backup_${backup.id}_${new Date(backup.createdAt).toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  logAudit({
    action: 'BACKUP_DOWNLOAD',
    targetType: 'BACKUP',
    targetId: backupId,
    targetName: backup.name,
    description: `تم تحميل النسخة الاحتياطية: ${backup.name}`,
  });

  return true;
}

// Check if auto backup is needed
export function checkAutoBackup(): boolean {
  const config = getBackupConfig();

  if (!config.enabled || !config.intervalHours) return false;

  const now = new Date();
  const lastBackup = config.lastBackupTime ? new Date(config.lastBackupTime) : null;

  if (!lastBackup) return true;

  const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastBackup >= config.intervalHours;
}

// Run auto backup if needed
export async function runAutoBackupIfNeeded(): Promise<BackupEntry | null> {
  if (!checkAutoBackup()) return null;

  const backup = await createBackup({
    type: 'AUTO',
    description: 'نسخة احتياطية تلقائية حسب الجدولة',
  });

  return backup;
}

// Start auto backup scheduler
let backupInterval: NodeJS.Timeout | null = null;

export function startBackupScheduler(): void {
  if (typeof window === 'undefined') return;

  // Check every minute
  if (backupInterval) {
    clearInterval(backupInterval);
  }

  backupInterval = setInterval(async () => {
    await runAutoBackupIfNeeded();
  }, 60 * 1000); // Check every minute

  // Also run immediately
  runAutoBackupIfNeeded();
}

export function stopBackupScheduler(): void {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
}

// Get admin info helper
function getCurrentAdmin(): { id: string; name: string } {
  try {
    const admins = JSON.parse(localStorage.getItem(storageKeys.admins) || '[]');
    if (admins.length > 0) {
      return { id: admins[0].id || 'admin', name: admins[0].name || 'المدير' };
    }
  } catch {
    // Ignore
  }
  return { id: 'system', name: 'النظام' };
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
