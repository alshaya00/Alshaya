import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.view_audit_logs && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const targetType = searchParams.get('targetType') || undefined;
    const targetId = searchParams.get('targetId') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const successParam = searchParams.get('success');
    const success = successParam === 'true' ? true : successParam === 'false' ? false : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (severity) where.severity = severity;
    if (success !== undefined) where.success = success;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        (where.timestamp as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.timestamp as Record<string, Date>).lte = end;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaClient = prisma as any;
    const [logs, total] = await Promise.all([
      prismaClient.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prismaClient.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

