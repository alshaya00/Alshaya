import { NextResponse } from 'next/server';
import { runBackupIfNeeded, getBackupStats, isBackupNeeded } from '@/lib/backup-scheduler';

/**
 * POST /api/backup/check
 * Replit-compatible: Trigger backup check on-demand
 * Called from client-side instead of using setInterval
 */
export async function POST() {
  try {
    const needed = await isBackupNeeded();

    if (!needed) {
      return NextResponse.json({
        success: true,
        backupRan: false,
        message: 'Backup not needed at this time',
      });
    }

    const result = await runBackupIfNeeded();

    return NextResponse.json({
      success: result.success ?? true,
      backupRan: result.ran,
      snapshotId: result.snapshotId,
      error: result.error,
    });
  } catch (error) {
    console.error('[Backup API] Error checking backup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/backup/check
 * Get backup status without triggering a backup
 */
export async function GET() {
  try {
    const stats = await getBackupStats();
    const needed = await isBackupNeeded();

    return NextResponse.json({
      success: true,
      backupNeeded: needed,
      stats: {
        totalBackups: stats.totalBackups,
        autoBackups: stats.autoBackups,
        manualBackups: stats.manualBackups,
        lastBackupTime: stats.lastBackupTime?.toISOString() || null,
        nextBackupTime: stats.nextBackupTime?.toISOString() || null,
        totalStorageBytes: stats.totalStorageBytes,
      },
    });
  } catch (error) {
    console.error('[Backup API] Error getting backup status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
