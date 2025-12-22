// آل شايع Family Tree - Backup Scheduler Service
// Replit-compatible: Uses database-triggered approach instead of setInterval
// Backups are triggered on-demand or via API calls, not continuous timers

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

// ============================================
// BACKUP OPERATIONS
// ============================================

/**
 * Get backup configuration from database
 * Replit-compatible: Reads from database instead of memory
 */
export async function getBackupConfigFromDB(): Promise<BackupConfig> {
  try {
    const config = await prisma.backupConfig.findUnique({
      where: { id: 'default' },
    });

    if (config) {
      return {
        enabled: config.enabled,
        intervalHours: config.intervalHours,
        maxBackups: config.maxBackups,
        retentionDays: config.retentionDays,
      };
    }
  } catch (error) {
    console.warn('[Backup Scheduler] Could not read config from DB:', error);
  }

  return { ...DEFAULT_CONFIG };
}

/**
 * Save backup configuration to database
 */
export async function saveBackupConfigToDB(config: Partial<BackupConfig>): Promise<BackupConfig> {
  try {
    const updated = await prisma.backupConfig.upsert({
      where: { id: 'default' },
      update: config,
      create: {
        id: 'default',
        ...DEFAULT_CONFIG,
        ...config,
      },
    });

    return {
      enabled: updated.enabled,
      intervalHours: updated.intervalHours,
      maxBackups: updated.maxBackups,
      retentionDays: updated.retentionDays,
    };
  } catch (error) {
    console.error('[Backup Scheduler] Failed to save config:', error);
    return { ...DEFAULT_CONFIG, ...config };
  }
}

/**
 * Check if a backup is needed based on last backup time
 * Replit-compatible: No timers, just time-based checks
 */
export async function isBackupNeeded(): Promise<boolean> {
  try {
    const config = await getBackupConfigFromDB();

    if (!config.enabled) {
      return false;
    }

    // Get the last auto backup
    const lastBackup = await prisma.snapshot.findFirst({
      where: { snapshotType: 'AUTO_BACKUP' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (!lastBackup) {
      return true; // No backup exists, create one
    }

    // Check if enough time has passed
    const hoursSinceLastBackup =
      (Date.now() - lastBackup.createdAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastBackup >= config.intervalHours;
  } catch (error) {
    console.error('[Backup Scheduler] Error checking backup status:', error);
    return false;
  }
}

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

    // Update backup config with last backup time
    await prisma.backupConfig.upsert({
      where: { id: 'default' },
      update: { lastBackupAt: new Date(), lastBackupStatus: 'SUCCESS' },
      create: {
        id: 'default',
        lastBackupAt: new Date(),
        lastBackupStatus: 'SUCCESS',
      },
    });

    // Clean up old backups if we exceed maxBackups
    await cleanupOldBackups();

    console.log(`[Backup Scheduler] Auto backup created: ${snapshot.id}`);

    return { success: true, snapshotId: snapshot.id };
  } catch (error) {
    console.error('[Backup Scheduler] Failed to create auto backup:', error);

    // Update backup config with failure status
    try {
      await prisma.backupConfig.upsert({
        where: { id: 'default' },
        update: {
          lastBackupStatus: 'FAILED',
          lastBackupError: error instanceof Error ? error.message : 'Unknown error',
        },
        create: {
          id: 'default',
          lastBackupStatus: 'FAILED',
          lastBackupError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch {
      // Ignore config update errors
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run backup if needed - call this from API routes or startup
 * Replit-compatible: Stateless, can be called from anywhere
 */
export async function runBackupIfNeeded(): Promise<{
  ran: boolean;
  success?: boolean;
  snapshotId?: string;
  error?: string;
}> {
  const needed = await isBackupNeeded();

  if (!needed) {
    return { ran: false };
  }

  const result = await createAutoBackup();
  return {
    ran: true,
    success: result.success,
    snapshotId: result.snapshotId,
    error: result.error,
  };
}

/**
 * Clean up old backups based on configuration
 */
export async function cleanupOldBackups(): Promise<number> {
  try {
    const config = await getBackupConfigFromDB();

    // Get all auto backups ordered by creation date
    const autoBackups = await prisma.snapshot.findMany({
      where: { snapshotType: 'AUTO_BACKUP' },
      orderBy: { createdAt: 'desc' },
    });

    let deletedCount = 0;

    // Delete backups exceeding maxBackups
    if (autoBackups.length > config.maxBackups) {
      const toDelete = autoBackups.slice(config.maxBackups);
      for (const backup of toDelete) {
        await prisma.snapshot.delete({ where: { id: backup.id } });
        deletedCount++;
      }
    }

    // Delete backups older than retentionDays
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

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
export async function getNextBackupTime(): Promise<Date | null> {
  const config = await getBackupConfigFromDB();

  if (!config.enabled) return null;

  try {
    const lastBackup = await prisma.snapshot.findFirst({
      where: { snapshotType: 'AUTO_BACKUP' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const baseTime = lastBackup?.createdAt || new Date();
    const nextTime = new Date(baseTime.getTime() + config.intervalHours * 60 * 60 * 1000);
    return nextTime;
  } catch {
    return null;
  }
}

/**
 * Get current backup configuration (sync version for backwards compatibility)
 */
export function getBackupConfig(): BackupConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Update backup configuration (sync version for backwards compatibility)
 */
export function updateBackupConfig(config: Partial<BackupConfig>): BackupConfig {
  // This is now async internally but returns sync for backwards compatibility
  saveBackupConfigToDB(config).catch(console.error);
  return { ...DEFAULT_CONFIG, ...config };
}

/**
 * Start the backup scheduler
 * Replit-compatible: No-op, backups are triggered via API
 * @deprecated Use runBackupIfNeeded() instead
 */
export function startBackupScheduler(): void {
  console.log('[Backup Scheduler] Replit mode: Backups triggered via API, not setInterval');
  // Run once on startup to check if backup is needed
  runBackupIfNeeded().catch(console.error);
}

/**
 * Stop the backup scheduler
 * Replit-compatible: No-op, nothing to stop
 * @deprecated No longer needed in Replit mode
 */
export function stopBackupScheduler(): void {
  console.log('[Backup Scheduler] Replit mode: No scheduler to stop');
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
    nextBackupTime: await getNextBackupTime(),
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
