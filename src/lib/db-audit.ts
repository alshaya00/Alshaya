import { PrismaClient } from '@prisma/client';

// Create a dedicated Prisma client for audit logging
// This bypasses the mock pattern used in src/lib/prisma.ts
const auditPrisma = new PrismaClient() as PrismaClient & {
  auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
  };
};

export async function logAuditToDb(params: {
  action: string;
  severity?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  description: string;
  details?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    console.error('[AUDIT] DATABASE_URL not set - audit log not persisted');
    return false;
  }

  try {
    await auditPrisma.auditLog.create({
      data: {
        action: params.action,
        severity: params.severity || 'INFO',
        userId: params.userId || null,
        userName: params.userName || null,
        userRole: params.userRole || null,
        targetType: params.targetType,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        description: params.description,
        details: params.details || null,
        previousState: params.previousState || null,
        newState: params.newState || null,
        success: params.success !== false,
        errorMessage: params.errorMessage || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
    return true;
  } catch (error) {
    console.error('[AUDIT] Failed to write audit log to database:', error);
    return false;
  }
}

export async function getAuditLogsFromDb(params: {
  action?: string;
  userId?: string;
  targetType?: string;
  targetId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ logs: unknown[]; total: number; page: number; limit: number }> {
  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (params.action) {
    where.action = params.action;
  }
  if (params.userId) {
    where.userId = params.userId;
  }
  if (params.targetType) {
    where.targetType = params.targetType;
  }
  if (params.targetId) {
    where.targetId = params.targetId;
  }
  if (params.severity) {
    where.severity = params.severity;
  }
  if (params.success !== undefined) {
    where.success = params.success;
  }
  if (params.startDate || params.endDate) {
    where.timestamp = {};
    if (params.startDate) {
      (where.timestamp as Record<string, Date>).gte = new Date(params.startDate);
    }
    if (params.endDate) {
      (where.timestamp as Record<string, Date>).lte = new Date(params.endDate);
    }
  }

  const [logs, total] = await Promise.all([
    auditPrisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    auditPrisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}
