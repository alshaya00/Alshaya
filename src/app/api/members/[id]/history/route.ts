import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { normalizeMemberId } from '@/lib/utils';
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const memberId = normalizeMemberId(params.id) || params.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaClient = prisma as any;

    const where = {
      targetType: 'MEMBER',
      targetId: memberId,
    };

    const [logs, total] = await Promise.all([
      prismaClient.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          timestamp: true,
          action: true,
          severity: true,
          userId: true,
          userName: true,
          userRole: true,
          targetId: true,
          targetName: true,
          description: true,
          details: true,
          previousState: true,
          newState: true,
          success: true,
          errorMessage: true,
          impactedIds: true,
          impactSummary: true,
        },
      }),
      prismaClient.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      memberId,
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching member history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch member history' },
      { status: 500 }
    );
  }
}
