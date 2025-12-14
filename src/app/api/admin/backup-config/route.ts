import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { safeJsonParse } from '@/lib/utils/safe-json';

// Helper to get auth user from request
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  return user;
}

// Default backup configuration
const DEFAULT_CONFIG = {
  enabled: true,
  cronExpression: '0 2 * * *', // Daily at 2 AM
  timezone: 'Asia/Riyadh',
  retentionDays: 30,
  maxBackups: 10,
  includeImages: false,
  compressionEnabled: true,
  notifyOnSuccess: false,
  notifyOnFailure: true,
  notifyEmails: [],
};

// GET /api/admin/backup-config - Get backup configuration
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Super Admin required' },
        { status: 401 }
      );
    }

    // Get or create the backup scheduled job
    let backupJob = await prisma.scheduledJob.findUnique({
      where: { name: 'AUTO_BACKUP' },
    });

    if (!backupJob) {
      // Create default backup job
      backupJob = await prisma.scheduledJob.create({
        data: {
          name: 'AUTO_BACKUP',
          description: 'Automatic family tree backup',
          cronExpression: DEFAULT_CONFIG.cronExpression,
          timezone: DEFAULT_CONFIG.timezone,
          jobType: 'BACKUP',
          jobConfig: JSON.stringify({
            retentionDays: DEFAULT_CONFIG.retentionDays,
            maxBackups: DEFAULT_CONFIG.maxBackups,
            includeImages: DEFAULT_CONFIG.includeImages,
            compressionEnabled: DEFAULT_CONFIG.compressionEnabled,
            notifyOnSuccess: DEFAULT_CONFIG.notifyOnSuccess,
            notifyOnFailure: DEFAULT_CONFIG.notifyOnFailure,
            notifyEmails: DEFAULT_CONFIG.notifyEmails,
          }),
          isEnabled: DEFAULT_CONFIG.enabled,
        },
      });
    }

    // Parse job config safely
    const jobConfig = safeJsonParse<Record<string, unknown>>(backupJob.jobConfig, {});

    return NextResponse.json({
      success: true,
      config: {
        enabled: backupJob.isEnabled,
        cronExpression: backupJob.cronExpression,
        timezone: backupJob.timezone,
        retentionDays: jobConfig.retentionDays || DEFAULT_CONFIG.retentionDays,
        maxBackups: jobConfig.maxBackups || DEFAULT_CONFIG.maxBackups,
        includeImages: jobConfig.includeImages || DEFAULT_CONFIG.includeImages,
        compressionEnabled: jobConfig.compressionEnabled ?? DEFAULT_CONFIG.compressionEnabled,
        notifyOnSuccess: jobConfig.notifyOnSuccess || DEFAULT_CONFIG.notifyOnSuccess,
        notifyOnFailure: jobConfig.notifyOnFailure ?? DEFAULT_CONFIG.notifyOnFailure,
        notifyEmails: jobConfig.notifyEmails || DEFAULT_CONFIG.notifyEmails,
        lastRunAt: backupJob.lastRunAt,
        lastRunStatus: backupJob.lastRunStatus,
        lastRunDuration: backupJob.lastRunDuration,
        lastRunError: backupJob.lastRunError,
        nextRunAt: backupJob.nextRunAt,
      },
    });
  } catch (error) {
    console.error('Error fetching backup config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch backup configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/backup-config - Update backup configuration
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Super Admin required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate cron expression (basic validation)
    if (body.cronExpression) {
      const cronParts = body.cronExpression.split(' ');
      if (cronParts.length !== 5) {
        return NextResponse.json(
          { success: false, message: 'Invalid cron expression. Must have 5 parts (minute hour day month weekday)' },
          { status: 400 }
        );
      }
    }

    // Validate retention days
    if (body.retentionDays !== undefined && (body.retentionDays < 1 || body.retentionDays > 365)) {
      return NextResponse.json(
        { success: false, message: 'Retention days must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Validate max backups
    if (body.maxBackups !== undefined && (body.maxBackups < 1 || body.maxBackups > 100)) {
      return NextResponse.json(
        { success: false, message: 'Max backups must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get existing config
    let backupJob = await prisma.scheduledJob.findUnique({
      where: { name: 'AUTO_BACKUP' },
    });

    const existingConfig = safeJsonParse<Record<string, unknown>>(backupJob?.jobConfig, {});

    // Merge new config
    const newJobConfig = {
      ...existingConfig,
      retentionDays: body.retentionDays ?? existingConfig.retentionDays ?? DEFAULT_CONFIG.retentionDays,
      maxBackups: body.maxBackups ?? existingConfig.maxBackups ?? DEFAULT_CONFIG.maxBackups,
      includeImages: body.includeImages ?? existingConfig.includeImages ?? DEFAULT_CONFIG.includeImages,
      compressionEnabled: body.compressionEnabled ?? existingConfig.compressionEnabled ?? DEFAULT_CONFIG.compressionEnabled,
      notifyOnSuccess: body.notifyOnSuccess ?? existingConfig.notifyOnSuccess ?? DEFAULT_CONFIG.notifyOnSuccess,
      notifyOnFailure: body.notifyOnFailure ?? existingConfig.notifyOnFailure ?? DEFAULT_CONFIG.notifyOnFailure,
      notifyEmails: body.notifyEmails ?? existingConfig.notifyEmails ?? DEFAULT_CONFIG.notifyEmails,
    };

    // Calculate next run time based on cron expression
    const nextRunAt = calculateNextRun(
      body.cronExpression || backupJob?.cronExpression || DEFAULT_CONFIG.cronExpression,
      body.timezone || backupJob?.timezone || DEFAULT_CONFIG.timezone
    );

    // Update or create the backup job
    backupJob = await prisma.scheduledJob.upsert({
      where: { name: 'AUTO_BACKUP' },
      update: {
        cronExpression: body.cronExpression || backupJob?.cronExpression,
        timezone: body.timezone || backupJob?.timezone,
        isEnabled: body.enabled ?? backupJob?.isEnabled,
        jobConfig: JSON.stringify(newJobConfig),
        nextRunAt,
      },
      create: {
        name: 'AUTO_BACKUP',
        description: 'Automatic family tree backup',
        cronExpression: body.cronExpression || DEFAULT_CONFIG.cronExpression,
        timezone: body.timezone || DEFAULT_CONFIG.timezone,
        jobType: 'BACKUP',
        jobConfig: JSON.stringify(newJobConfig),
        isEnabled: body.enabled ?? DEFAULT_CONFIG.enabled,
        nextRunAt,
      },
    });

    const config = safeJsonParse<Record<string, unknown>>(backupJob.jobConfig, {});

    return NextResponse.json({
      success: true,
      message: 'Backup configuration updated',
      messageAr: 'تم تحديث إعدادات النسخ الاحتياطي',
      config: {
        enabled: backupJob.isEnabled,
        cronExpression: backupJob.cronExpression,
        timezone: backupJob.timezone,
        retentionDays: config.retentionDays,
        maxBackups: config.maxBackups,
        includeImages: config.includeImages,
        compressionEnabled: config.compressionEnabled,
        notifyOnSuccess: config.notifyOnSuccess,
        notifyOnFailure: config.notifyOnFailure,
        notifyEmails: config.notifyEmails,
        nextRunAt: backupJob.nextRunAt,
      },
    });
  } catch (error) {
    console.error('Error updating backup config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update backup configuration' },
      { status: 500 }
    );
  }
}

// POST /api/admin/backup-config - Trigger manual backup
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // Get all family members
    const members = await prisma.familyMember.findMany();

    // Create snapshot
    const snapshot = await prisma.snapshot.create({
      data: {
        name: name || `Manual Backup - ${new Date().toISOString()}`,
        description: description || 'Manual backup triggered by admin',
        treeData: JSON.stringify(members),
        memberCount: members.length,
        createdBy: user.id,
        createdByName: user.nameArabic,
        snapshotType: 'MANUAL',
      },
    });

    // Update the scheduled job's last run info
    await prisma.scheduledJob.update({
      where: { name: 'AUTO_BACKUP' },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: 'SUCCESS',
        lastRunDuration: 0,
      },
    }).catch(() => {
      // Job might not exist yet
    });

    return NextResponse.json({
      success: true,
      message: 'Manual backup created successfully',
      messageAr: 'تم إنشاء النسخة الاحتياطية بنجاح',
      snapshot: {
        id: snapshot.id,
        name: snapshot.name,
        memberCount: snapshot.memberCount,
        createdAt: snapshot.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating manual backup:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next run time from cron expression
function calculateNextRun(cronExpression: string, timezone: string): Date {
  // Simple implementation - just set next run to tomorrow at the specified hour
  // In production, use a proper cron parser library
  const parts = cronExpression.split(' ');
  const minute = parseInt(parts[0]) || 0;
  const hour = parseInt(parts[1]) || 2;

  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}
