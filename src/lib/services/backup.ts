// Automated Backup Service
// Al-Shaye Family Tree Application

import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email';

// ============================================
// TYPES
// ============================================

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retentionDays: number;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyEmail?: string;
}

export interface BackupResult {
  success: boolean;
  snapshotId?: string;
  snapshotName?: string;
  memberCount?: number;
  duration?: number;
  error?: string;
  verified?: boolean;
  expectedCount?: number;
  actualCount?: number;
  backupSize?: number;
  sizeWarning?: string;
  sizeWarningAr?: string;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  schedule: '0 3 * * *', // Daily at 3 AM
  retentionDays: 30,
  notifyOnSuccess: false,
  notifyOnFailure: true,
};

// ============================================
// BACKUP SERVICE
// ============================================

export class BackupService {
  private config: BackupConfig = DEFAULT_CONFIG;

  async getConfig(): Promise<BackupConfig> {
    try {
      const job = await prisma.scheduledJob?.findUnique({
        where: { name: 'auto-backup' },
      });

      if (job?.jobConfig) {
        const config = JSON.parse(job.jobConfig);
        this.config = { ...DEFAULT_CONFIG, ...config };
      }
    } catch {
      // Use default config
    }

    return this.config;
  }

  async setConfig(config: Partial<BackupConfig>): Promise<void> {
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
        // Delete all existing members (cascade will handle related records)
        await tx.familyMember.deleteMany({});

        // Re-create members
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
// CRON JOB RUNNER (Call this from an external scheduler)
// ============================================

export async function runScheduledBackup(): Promise<BackupResult> {
  const config = await backupService.getConfig();

  if (!config.enabled) {
    return { success: false, error: 'Backup is disabled' };
  }

  // Run backup
  const result = await backupService.createBackup();

  // Cleanup old backups
  if (result.success) {
    await backupService.cleanupOldBackups();
  }

  return result;
}
