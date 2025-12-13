// آل شايع Family Tree - Backup Scheduler Service
// Handles automatic backup scheduling and management

import { prisma } from '@/lib/prisma';

// ============================================
// BACKUP CONFIGURATION
// ============================================

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  maxBackups: number;
  retentionDays: number;
}

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  intervalHours: 24, // Daily backups
  maxBackups: 10,
  retentionDays: 30,
};

let currentConfig: BackupConfig = { ...DEFAULT_CONFIG };
let scheduledBackupTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================
// BACKUP OPERATIONS
// ============================================

/**
 * Create an automatic backup snapshot
 */
export async function createAutoBackup(): Promise<{
  success: boolean;
  snapshotId?: string;
  error?: string;
}> {
  try {
    // Get all current members
    const members = await prisma.familyMember.findMany();

    // Create the backup snapshot
    const snapshot = await prisma.snapshot.create({
      data: {
        name: `Auto Backup - ${new Date().toLocaleString('ar-SA')}`,
        description: 'Automatic scheduled backup',
        treeData: JSON.stringify(members),
        memberCount: members.length,
        createdBy: 'SYSTEM',
        createdByName: 'النظام (تلقائي)',
        snapshotType: 'AUTO_BACKUP',
      },
    });

    // Clean up old backups if we exceed maxBackups
    await cleanupOldBackups();

    console.log(`[Backup Scheduler] Auto backup created: ${snapshot.id}`);

    return { success: true, snapshotId: snapshot.id };
  } catch (error) {
    console.error('[Backup Scheduler] Failed to create auto backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up old backups based on configuration
 */
export async function cleanupOldBackups(): Promise<number> {
  try {
    // Get all auto backups ordered by creation date
    const autoBackups = await prisma.snapshot.findMany({
      where: { snapshotType: 'AUTO_BACKUP' },
      orderBy: { createdAt: 'desc' },
    });

    let deletedCount = 0;

    // Delete backups exceeding maxBackups
    if (autoBackups.length > currentConfig.maxBackups) {
      const toDelete = autoBackups.slice(currentConfig.maxBackups);
      for (const backup of toDelete) {
        await prisma.snapshot.delete({ where: { id: backup.id } });
        deletedCount++;
      }
    }

    // Delete backups older than retentionDays
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - currentConfig.retentionDays);

    const oldBackups = await prisma.snapshot.findMany({
      where: {
        snapshotType: 'AUTO_BACKUP',
        createdAt: { lt: cutoffDate },
      },
    });

    for (const backup of oldBackups) {
      await prisma.snapshot.delete({ where: { id: backup.id } });
      deletedCount++;
    }

    if (deletedCount > 0) {
      console.log(`[Backup Scheduler] Cleaned up ${deletedCount} old backups`);
    }

    return deletedCount;
  } catch (error) {
    console.error('[Backup Scheduler] Failed to clean up old backups:', error);
    return 0;
  }
}

/**
 * Get the next scheduled backup time
 */
export function getNextBackupTime(): Date | null {
  if (!currentConfig.enabled) return null;

  const nextTime = new Date();
  nextTime.setHours(nextTime.getHours() + currentConfig.intervalHours);
  return nextTime;
}

/**
 * Get current backup configuration
 */
export function getBackupConfig(): BackupConfig {
  return { ...currentConfig };
}

/**
 * Update backup configuration
 */
export function updateBackupConfig(config: Partial<BackupConfig>): BackupConfig {
  currentConfig = { ...currentConfig, ...config };

  // Restart scheduler if interval changed or enabled status changed
  if (config.intervalHours !== undefined || config.enabled !== undefined) {
    stopBackupScheduler();
    if (currentConfig.enabled) {
      startBackupScheduler();
    }
  }

  return { ...currentConfig };
}

/**
 * Start the backup scheduler
 */
export function startBackupScheduler(): void {
  if (scheduledBackupTimer) {
    console.log('[Backup Scheduler] Scheduler already running');
    return;
  }

  if (!currentConfig.enabled) {
    console.log('[Backup Scheduler] Scheduler is disabled');
    return;
  }

  const intervalMs = currentConfig.intervalHours * 60 * 60 * 1000;

  // Schedule the next backup
  scheduledBackupTimer = setInterval(async () => {
    console.log('[Backup Scheduler] Running scheduled backup...');
    await createAutoBackup();
  }, intervalMs);

  console.log(`[Backup Scheduler] Started with ${currentConfig.intervalHours} hour interval`);
}

/**
 * Stop the backup scheduler
 */
export function stopBackupScheduler(): void {
  if (scheduledBackupTimer) {
    clearInterval(scheduledBackupTimer);
    scheduledBackupTimer = null;
    console.log('[Backup Scheduler] Scheduler stopped');
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalBackups: number;
  autoBackups: number;
  manualBackups: number;
  lastBackupTime: Date | null;
  nextBackupTime: Date | null;
  totalStorageBytes: number;
}> {
  const snapshots = await prisma.snapshot.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      snapshotType: true,
      createdAt: true,
      treeData: true,
    },
  });

  const autoBackups = snapshots.filter((s: typeof snapshots[0]) => s.snapshotType === 'AUTO_BACKUP').length;
  const manualBackups = snapshots.filter((s: typeof snapshots[0]) => s.snapshotType === 'MANUAL').length;
  const lastBackup = snapshots[0];

  // Estimate storage (rough calculation based on JSON string length)
  const totalStorageBytes = snapshots.reduce((acc: number, s: typeof snapshots[0]) => acc + (s.treeData?.length || 0), 0);

  return {
    totalBackups: snapshots.length,
    autoBackups,
    manualBackups,
    lastBackupTime: lastBackup?.createdAt || null,
    nextBackupTime: getNextBackupTime(),
    totalStorageBytes,
  };
}

/**
 * Verify backup integrity by checking if it can be parsed
 */
export async function verifyBackupIntegrity(snapshotId: string): Promise<{
  valid: boolean;
  memberCount: number;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const snapshot = await prisma.snapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      return { valid: false, memberCount: 0, issues: ['Snapshot not found'] };
    }

    // Try to parse the tree data
    let members;
    try {
      members = JSON.parse(snapshot.treeData);
    } catch {
      return { valid: false, memberCount: 0, issues: ['Invalid JSON data'] };
    }

    if (!Array.isArray(members)) {
      return { valid: false, memberCount: 0, issues: ['Data is not an array'] };
    }

    // Check member count matches
    if (members.length !== snapshot.memberCount) {
      issues.push(`Member count mismatch: expected ${snapshot.memberCount}, found ${members.length}`);
    }

    // Check for required fields in members
    for (const member of members) {
      if (!member.id) {
        issues.push(`Member missing ID`);
        break;
      }
      if (!member.firstName) {
        issues.push(`Member ${member.id} missing firstName`);
        break;
      }
    }

    return {
      valid: issues.length === 0,
      memberCount: members.length,
      issues,
    };
  } catch (error) {
    return {
      valid: false,
      memberCount: 0,
      issues: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
