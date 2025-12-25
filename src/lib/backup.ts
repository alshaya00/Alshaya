// Client-side Backup Service - Database Driven
// Uses API calls for primary storage, no localStorage used for snapshots

import { logBackupCreate, logBackupRestore, logAudit } from './audit';
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
  data?: string; // Optional JSON stringified data, only when needed
  checksum?: string;
}

// Default backup configuration
const defaultConfig: BackupConfig = {
  enabled: true,
  intervalHours: backupSettings.defaultIntervalHours,
  maxBackups: backupSettings.maxBackups,
  lastBackupTime: null,
  nextBackupTime: null,
};

// Get backup configuration from database
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

// Save backup configuration to database
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

// Get all backups from database
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

// Create a backup - Database driven
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

// Restore from backup
export async function restoreBackup(
  user: { id: string; name: string; role: string } | null,
  backupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // API uses POST with action: 'restore' per existing route implementation
    // The instruction said PUT, but existing route uses POST. I will implement PUT in the route later to be safe.
    const res = await fetch(`/api/admin/snapshots/${backupId}`, {
      method: 'PUT', // We'll update the API to support PUT as requested
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore' }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      // Log restore action
      logBackupRestore(user, backupId, data.snapshotName || backupId);
      return { success: true };
    }
    return { success: false, error: data.messageAr || data.message || 'فشلت استعادة النسخة الاحتياطية' };
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, error: 'حدث خطأ أثناء استعادة النسخة الاحتياطية' };
  }
}

// Delete a backup
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

// Download backup as file
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

// Check if auto backup is needed
export async function checkAutoBackup(): Promise<boolean> {
  const config = await getBackupConfig();

  if (!config.enabled || !config.intervalHours) return false;

  const now = new Date();
  const lastBackup = config.lastBackupTime ? new Date(config.lastBackupTime) : null;

  if (!lastBackup) return true;

  const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastBackup >= config.intervalHours;
}

// Run auto backup if needed
export async function runAutoBackupIfNeeded(user: { id: string; name: string; role: string } | null): Promise<BackupEntry | null> {
  if (!(await checkAutoBackup())) return null;

  const backup = await createBackup(user, {
    type: 'AUTO',
    description: 'نسخة احتياطية تلقائية حسب الجدولة',
  });

  return backup;
}

/**
 * Start auto backup scheduler
 * Replit-compatible: Runs check once on mount, no setInterval
 */
export function startBackupScheduler(user: { id: string; name: string; role: string } | null): void {
  if (typeof window === 'undefined') return;

  // Run once to check if backup is needed (no interval)
  runAutoBackupIfNeeded(user).catch(console.error);

  // Trigger server-side backup check via API
  fetch('/api/backup/check', { method: 'POST' }).catch(() => {
    // Ignore API errors
  });
}

/**
 * Stop backup scheduler
 * Replit-compatible: No-op
 */
export function stopBackupScheduler(): void {
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

